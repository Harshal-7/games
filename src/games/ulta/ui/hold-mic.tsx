"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { useClock } from "@/party/ui/use-clock";

import type { Clip } from "../logic/audio";
import { MicIcon } from "./marks";
import { canUseRecorder, MicError, startRecording, type Recording } from "./mic";
import { stopPlaying } from "./player";

type Phase = { kind: "idle" } | { kind: "opening" } | { kind: "live"; since: number };

/**
 * The mic button: the mic is on only while it's held, and lets go by itself after
 * `maxSeconds`. Lifting the finger, a cancelled touch, or the page going out of sight
 * all end the take, and `onDone` gets what was recorded. `quiet` draws it as an
 * outlined button, for a second try once there's a take.
 */
export function HoldMic({
  label,
  maxSeconds,
  quiet = false,
  disabled = false,
  onDone,
  onProblem,
}: {
  label: string;
  maxSeconds: number;
  quiet?: boolean;
  disabled?: boolean;
  onDone: (clip: Clip) => void;
  onProblem: (error: MicError) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const recording = useRef<Recording | null>(null);
  const limit = useRef<number | undefined>(undefined);
  const latest = useRef({ onDone, onProblem, maxSeconds });
  useEffect(() => {
    latest.current = { onDone, onProblem, maxSeconds };
  });
  const now = useClock(phase.kind === "live");

  const end = useCallback(async () => {
    const rec = recording.current;
    if (!rec) return;
    recording.current = null;
    window.clearTimeout(limit.current);
    setPhase({ kind: "idle" });
    try {
      latest.current.onDone(await rec.stop());
    } catch (error) {
      latest.current.onProblem(error instanceof MicError ? error : new MicError("failed", String(error)));
    }
  }, []);

  const begin = () => {
    if (recording.current || disabled) return;
    stopPlaying();
    // MediaRecorder where there is one (it passed the tech check on an iPhone); raw samples otherwise.
    const rec = startRecording({ way: canUseRecorder() ? "recorder" : "samples", processing: false });
    recording.current = rec;
    setPhase({ kind: "opening" });
    rec.live.then(
      () => {
        if (recording.current !== rec) return;
        setPhase({ kind: "live", since: Date.now() });
        limit.current = window.setTimeout(() => void end(), latest.current.maxSeconds * 1000);
      },
      (error: unknown) => {
        if (recording.current === rec) {
          recording.current = null;
          setPhase({ kind: "idle" });
        }
        rec.cancel();
        latest.current.onProblem(error instanceof MicError ? error : new MicError("failed", String(error)));
      },
    );
  };

  // A locked phone or a switched app ends the take; leaving the screen drops it.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void end();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.clearTimeout(limit.current);
      recording.current?.cancel();
      recording.current = null;
    };
  }, [end]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Without capture the take still ends on pointerup/cancel.
    }
    begin();
  };
  const isKey = (key: string) => key === " " || key === "Enter";
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!isKey(e.key)) return;
    e.preventDefault();
    if (!e.repeat) begin();
  };

  const held = phase.kind === "live" ? Math.max(0, Math.min(maxSeconds, (now - phase.since) / 1000)) : 0;
  return (
    <div className={quiet ? "ul-mic is-quiet" : "ul-mic"} data-phase={phase.kind}>
      <button
        type="button"
        className="ul-mic-btn"
        disabled={disabled}
        aria-pressed={phase.kind !== "idle"}
        onPointerDown={onPointerDown}
        onPointerUp={() => void end()}
        onPointerCancel={() => void end()}
        onLostPointerCapture={() => void end()}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => isKey(e.key) && void end()}
        onBlur={() => void end()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <MicIcon width={quiet ? 22 : 34} height={quiet ? 22 : 34} />
        <span className="ul-mic-label">
          {phase.kind === "idle" ? label : phase.kind === "opening" ? "Wait…" : "Recording"}
        </span>
      </button>
      <div className="ul-mic-meter" aria-hidden="true">
        <span style={{ width: `${(held / maxSeconds) * 100}%` }} />
      </div>
      <p className="ul-mic-time" aria-live="polite">
        {phase.kind === "live"
          ? `${Math.floor(held)} of ${maxSeconds} seconds`
          : phase.kind === "opening"
            ? "Turning the mic on"
            : `Hold it down, up to ${maxSeconds} seconds`}
      </p>
    </div>
  );
}
