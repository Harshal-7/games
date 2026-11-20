"use client";

import { toMono, type Clip } from "../logic/audio";

/**
 * The mic, on only while a button is held. Two ways to record, because phones differ:
 * "recorder" uses MediaRecorder and decodes the file it makes (iPhones record mp4/AAC,
 * Android webm/Opus); "samples" copies the raw samples out of Web Audio as they come.
 * Either way the recording only ever lives in this page's memory.
 */
export type RecordWay = "recorder" | "samples";

/** Why the mic couldn't start. */
export type MicProblem = "denied" | "busy" | "missing" | "unsupported" | "insecure" | "failed";

export class MicError extends Error {
  constructor(
    readonly problem: MicProblem,
    message: string,
  ) {
    super(message);
  }
}

export type MicOptions = {
  way: RecordWay;
  /** The phone's speech clean-up (echo cancelling, noise suppression, auto gain). Off for singing. */
  processing: boolean;
  /** Notes for the tech check's log. */
  onLog?: (line: string) => void;
};

/** A recording in progress. */
export type Recording = {
  /** Settles when sound is being captured (or the mic failed). */
  live: Promise<void>;
  /** Turns the mic off and gives back what was recorded (empty if it never went live). */
  stop: () => Promise<Clip>;
  /** Turns the mic off and drops the recording. */
  cancel: () => void;
};

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/** iPhones only: what the page's audio is for right now. Does nothing elsewhere. */
export function setAudioSession(type: "auto" | "playback" | "play-and-record"): string | null {
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session) return null;
  try {
    session.type = type;
  } catch {
    // An older Safari that has the object but not this type: leave it.
  }
  return session.type;
}

/** Whether the browser can record at all, and why not. */
export function micSupport(): MicProblem | null {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return null;
}

/** Whether MediaRecorder exists here, so "recorder" can be used. */
export function canUseRecorder(): boolean {
  return typeof window !== "undefined" && "MediaRecorder" in window;
}

/** The mic permission as the browser reports it; "unknown" where it can't say. */
export async function micPermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

function problemOf(error: unknown): MicError {
  const name = error instanceof Error ? error.name : "";
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return new MicError("denied", text);
    case "SecurityError":
      return new MicError(window.isSecureContext ? "denied" : "insecure", text);
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return new MicError("busy", text);
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return new MicError("missing", text);
    default:
      return new MicError("failed", text);
  }
}

async function openMic(processing: boolean): Promise<MediaStream> {
  const support = micSupport();
  if (support) throw new MicError(support, support);
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: processing,
        noiseSuppression: processing,
        autoGainControl: processing,
        channelCount: 1,
      },
    });
  } catch (error) {
    throw problemOf(error);
  }
}

function closeMic(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

/**
 * Asks for the mic once and turns it straight off, so the permission prompt never
 * lands in the middle of a hold. Throws a MicError when it can't.
 */
export async function askForMic(): Promise<void> {
  setAudioSession("auto");
  closeMic(await openMic(false));
}

const EMPTY: Clip = { samples: new Float32Array(0), rate: 48000 };

/**
 * Starts recording. Call it from the press itself: the sound parts need a tap to
 * start on iPhones.
 */
export function startRecording({ way, processing, onLog }: MicOptions): Recording {
  const log = onLog ?? (() => {});
  const session = setAudioSession("auto");
  if (session) log(`audio session: ${session}`);
  return way === "recorder" ? withRecorder(processing, log) : withSamples(processing, log);
}

function describe(stream: MediaStream, log: (line: string) => void): void {
  const track = stream.getAudioTracks()[0];
  if (!track) return;
  const s = track.getSettings();
  log(
    `mic: ${track.label || "unnamed"} · ${s.sampleRate ?? "?"} Hz · ${s.channelCount ?? "?"} ch · echo ${s.echoCancellation} · noise ${s.noiseSuppression} · gain ${s.autoGainControl}`,
  );
}

function withRecorder(processing: boolean, log: (line: string) => void): Recording {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let stopped = false;
  const chunks: Blob[] = [];
  const asked = performance.now();

  const live = (async () => {
    stream = await openMic(processing);
    if (stopped) {
      closeMic(stream);
      return;
    }
    describe(stream, log);
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    await new Promise<void>((resolve) => {
      recorder!.onstart = () => resolve();
      recorder!.start();
    });
    log(`recording (${recorder.mimeType || "default type"}) after ${Math.round(performance.now() - asked)} ms`);
  })();

  return {
    live,
    cancel() {
      stopped = true;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      closeMic(stream);
      chunks.length = 0;
    },
    async stop() {
      stopped = true;
      try {
        await live;
      } catch {
        return EMPTY;
      }
      const rec = recorder;
      if (!rec) {
        closeMic(stream);
        return EMPTY;
      }
      if (rec.state !== "inactive") {
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve();
          rec.stop();
        });
      }
      closeMic(stream);
      const blob = new Blob(chunks, { type: rec.mimeType });
      chunks.length = 0;
      if (blob.size === 0) return EMPTY;
      const started = performance.now();
      // An offline context decodes without touching the one that plays sound.
      const decoder = new OfflineAudioContext(1, 1, 48000);
      const buffer = await decoder.decodeAudioData(await blob.arrayBuffer());
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      log(
        `decoded ${(blob.size / 1024).toFixed(0)} KB ${blob.type} → ${buffer.duration.toFixed(2)} s, ${buffer.numberOfChannels} ch, in ${Math.round(performance.now() - started)} ms`,
      );
      return { samples: toMono(channels), rate: buffer.sampleRate };
    },
  };
}

/** Collects each block of samples, mixed to mono, and sends them out in batches. */
const CAPTURE_WORKLET = `
class UltaCapture extends AudioWorkletProcessor {
  constructor() { super(); this.batch = new Float32Array(4096); this.filled = 0; this.port.onmessage = () => this.flush(); }
  flush() { if (this.filled) { this.port.postMessage(this.batch.slice(0, this.filled)); this.filled = 0; } this.port.postMessage(null); }
  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;
    const n = channels[0].length;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const c of channels) sum += c[i];
      this.batch[this.filled++] = sum / channels.length;
      if (this.filled === this.batch.length) { this.port.postMessage(this.batch.slice()); this.filled = 0; }
    }
    return true;
  }
}
registerProcessor("ulta-capture", UltaCapture);
`;

function withSamples(processing: boolean, log: (line: string) => void): Recording {
  // Its own context, made in the press and closed after, so the context that plays
  // sound never has the mic plugged into it.
  const Context = window.AudioContext;
  if (!Context || !("AudioWorkletNode" in window)) {
    const failed = Promise.reject(new MicError("unsupported", "no AudioWorklet"));
    failed.catch(() => {});
    return { live: failed, stop: async () => EMPTY, cancel() {} };
  }
  const ctx = new Context();
  void ctx.resume();
  let stream: MediaStream | null = null;
  let node: AudioWorkletNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let stopped = false;
  // Lets a stop before the first samples arrive end the wait for them.
  let heardFirst = () => {};
  const blocks: Float32Array[] = [];
  const asked = performance.now();

  const finish = () => {
    source?.disconnect();
    node?.disconnect();
    closeMic(stream);
    void ctx.close();
  };

  const live = (async () => {
    const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "text/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    stream = await openMic(processing);
    if (stopped) {
      finish();
      return;
    }
    describe(stream, log);
    source = ctx.createMediaStreamSource(stream);
    node = new AudioWorkletNode(ctx, "ulta-capture", { numberOfOutputs: 1 });
    const heard = new Promise<void>((resolve) => (heardFirst = resolve));
    node.port.onmessage = (e: MessageEvent<Float32Array | null>) => {
      if (e.data) {
        blocks.push(e.data);
        heardFirst();
      }
    };
    source.connect(node);
    // Plugged into the speakers so the browser keeps it running; it only ever outputs silence.
    node.connect(ctx.destination);
    await heard;
    log(`recording raw samples at ${ctx.sampleRate} Hz (context ${ctx.state}) after ${Math.round(performance.now() - asked)} ms`);
  })();

  return {
    live,
    cancel() {
      stopped = true;
      heardFirst();
      blocks.length = 0;
      finish();
    },
    async stop() {
      stopped = true;
      heardFirst();
      try {
        await live;
      } catch {
        finish();
        return EMPTY;
      }
      const port = node?.port;
      if (port) {
        // Ask for the last partial batch, then wait for the end marker.
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 300);
          port.onmessage = (e: MessageEvent<Float32Array | null>) => {
            if (e.data) blocks.push(e.data);
            else {
              window.clearTimeout(timeout);
              resolve();
            }
          };
          port.postMessage("flush");
        });
      }
      const rate = ctx.sampleRate;
      finish();
      const length = blocks.reduce((n, b) => n + b.length, 0);
      const samples = new Float32Array(length);
      let at = 0;
      for (const block of blocks) {
        samples.set(block, at);
        at += block.length;
      }
      blocks.length = 0;
      return { samples, rate };
    },
  };
}
