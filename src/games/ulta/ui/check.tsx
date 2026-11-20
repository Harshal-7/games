"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useHydrated } from "@/party/ui/use-hydrated";
import { audioContext, playNotes } from "@/ui/sound";

import { checkTake, levelGain, levelled, loudness, reversed, seconds, type Clip } from "../logic/audio";
import { HoldMic } from "./hold-mic";
import { askForMic, canUseRecorder, micPermission, MicError, setAudioSession, type RecordWay } from "./mic";
import { MIC_HELP } from "./mic-help";
import { playClips, stopPlaying } from "./player";

import "@/party/ui/party.css";
import "./ulta.css";

const SING_MAX = 10;
const SING_MIN = 2;
const COPY_EXTRA = 2;

const db = (x: number) => (x > 0 ? `${Math.round(20 * Math.log10(x)) || 0} dB` : "-∞ dB");

/**
 * The tech check: record, flip and play, on a bare page, before any game screens are
 * built. Everything stays in this page's memory; the log is for a screenshot when
 * something doesn't work on a phone.
 */
export function UltaCheck() {
  const [way, setWay] = useState<RecordWay>("recorder");
  const [processing, setProcessing] = useState(false);
  const [even, setEven] = useState(true);
  const [permission, setPermission] = useState<string>("checking");
  const [problem, setProblem] = useState<MicError | null>(null);
  const [original, setOriginal] = useState<Clip | null>(null);
  const [copy, setCopy] = useState<Clip | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);

  const log = (line: string) => setLines((all) => [...all.slice(-60), `${new Date().toLocaleTimeString()} ${line}`]);

  // Without MediaRecorder (only known in the browser), B is the only way.
  const recorderOk = useHydrated() && canUseRecorder();
  const wayNow: RecordWay = recorderOk ? way : "samples";

  useEffect(() => {
    void micPermission().then((state) => {
      setPermission(state);
      log(navigator.userAgent);
      log(
        `MediaRecorder: ${canUseRecorder() ? "yes" : "no"} · AudioWorklet: ${"AudioWorkletNode" in window ? "yes" : "no"} · audioSession: ${"audioSession" in navigator ? "yes" : "no"}`,
      );
    });
    return () => stopPlaying();
  }, []);

  const took = (which: "sing" | "copy", raw: Clip) => {
    const { peak, level } = loudness(raw.samples);
    log(`${which}: raw ${seconds(raw).toFixed(2)} s at ${raw.rate} Hz · peak ${db(peak)} · level ${db(level)}`);
    setProblem(null);
    const check = checkTake(raw, which === "sing" ? SING_MIN : 1);
    if (check.kind === "silent") {
      setNote("Didn't hear anything. Hold the button and sing close to the phone.");
      return;
    }
    if (check.kind === "short") {
      setNote(`That was only ${check.seconds.toFixed(1)} s of sound. Sing a whole line, 4 to 8 seconds.`);
      return;
    }
    const clip = check.clip;
    log(`${which}: trimmed to ${seconds(clip).toFixed(2)} s · turned up ${db(levelGain(clip.samples))}`);
    setNote(null);
    if (which === "sing") {
      setOriginal(clip);
      setCopy(null);
    } else setCopy(clip);
  };

  const prepared = (clip: Clip, flip: boolean): Clip => {
    const samples = flip ? reversed(clip.samples) : clip.samples;
    return { samples: even ? levelled(samples, clip.rate) : samples, rate: clip.rate };
  };

  const play = (what: string, clips: Clip[]) => {
    const playing = playClips(clips);
    const ctx = audioContext();
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession?.type;
    log(`play ${what}: context ${ctx?.state} at ${ctx?.sampleRate} Hz${session ? ` · session ${session}` : ""}`);
    void playing.ended.then(() => log(`play ${what}: done`));
  };

  const problemHelp = problem ? MIC_HELP[problem.problem] : null;

  return (
    <div className="ul-check">
      <header>
        <h1 className="game-title">Ulta: mic check</h1>
        <p className="game-blurb">
          Sing a line, hear it backwards, copy it, and hear the copy flipped forwards. Nothing is saved or sent
          anywhere: the recordings live in this page&apos;s memory and vanish when you leave it.
        </p>
      </header>

      <Card title="1 · The mic">
        <p className="ul-check-line">
          Permission: <b>{permission}</b>
        </p>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await askForMic();
              setProblem(null);
              setPermission(await micPermission());
              log("mic allowed, and turned off again");
            } catch (error) {
              const e = error instanceof MicError ? error : new MicError("failed", String(error));
              setProblem(e);
              log(`mic: ${e.problem} (${e.message})`);
            }
          }}
        >
          Ask for the mic
        </button>
        {problemHelp && (
          <div className="ul-problem" role="alert">
            <strong>{problemHelp.title}</strong>
            <p>{problemHelp.detail}</p>
          </div>
        )}
      </Card>

      <Card title="2 · Options">
        <Row label="Way to record" detail="A: MediaRecorder, then decode. B: raw samples from Web Audio.">
          <div className="seg" role="radiogroup" aria-label="Way to record">
            <button
              type="button"
              role="radio"
              aria-checked={wayNow === "recorder"}
              disabled={!recorderOk}
              onClick={() => setWay("recorder")}
            >
              A
            </button>
            <button type="button" role="radio" aria-checked={wayNow === "samples"} onClick={() => setWay("samples")}>
              B
            </button>
          </div>
        </Row>
        <Row label="Voice clean-up" detail="Echo, noise and auto volume. Off is meant to suit singing.">
          <Switch on={processing} onChange={setProcessing} label="Voice clean-up" />
        </Row>
        <Row label="Even out the volume" detail="Turns quiet takes up so they play loud.">
          <Switch on={even} onChange={setEven} label="Even out the volume" />
        </Row>
      </Card>

      <Card title="3 · Sing">
        <HoldMic
          label="Hold and sing"
          maxSeconds={SING_MAX}
          way={wayNow}
          processing={processing}
          onDone={(clip) => took("sing", clip)}
          onProblem={(e) => {
            setProblem(e);
            log(`mic: ${e.problem} (${e.message})`);
          }}
          onLog={log}
        />
        {note && <p className="ul-note">{note}</p>}
        <div className="ul-check-actions">
          <button type="button" className="btn" disabled={!original} onClick={() => original && play("backwards", [prepared(original, true)])}>
            Play backwards
          </button>
          <button type="button" className="btn" disabled={!original} onClick={() => original && play("forwards", [prepared(original, false)])}>
            Play forwards
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setAudioSession("playback");
              playNotes([
                [660, 0, 0.25, 0.2],
                [880, 0.3, 0.4, 0.2],
              ]);
              log("test tone");
            }}
          >
            Test tone
          </button>
        </div>
      </Card>

      <Card title="4 · Copy it">
        <HoldMic
          label="Hold and copy"
          maxSeconds={original ? Math.ceil(seconds(original) + COPY_EXTRA) : SING_MAX}
          way={wayNow}
          processing={processing}
          disabled={!original}
          onDone={(clip) => took("copy", clip)}
          onProblem={(e) => {
            setProblem(e);
            log(`mic: ${e.problem} (${e.message})`);
          }}
          onLog={log}
        />
        <div className="ul-check-actions">
          <button type="button" className="btn" disabled={!copy} onClick={() => copy && play("copy flipped", [prepared(copy, true)])}>
            Play the copy, flipped
          </button>
          <button
            type="button"
            className="btn"
            disabled={!copy || !original}
            onClick={() => original && copy && play("both", [prepared(original, false), prepared(copy, true)])}
          >
            Original, then the copy
          </button>
          <button type="button" className="btn" onClick={() => stopPlaying()}>
            Stop
          </button>
        </div>
      </Card>

      <Card title="Log">
        <pre className="ul-log">{lines.join("\n")}</pre>
        <button type="button" className="btn" onClick={() => setLines([])}>
          Clear
        </button>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card section ul-check-card">
      <h2 className="tape">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, detail, children }: { label: string; detail: string; children: ReactNode }) {
  return (
    <div className="switch-row">
      <span>
        <span className="switch-label">{label}</span>
        <span className="switch-detail">{detail}</span>
      </span>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}
