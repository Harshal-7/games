"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { useClock } from "@/party/ui/use-clock";

import type { Clip } from "../logic/audio";
import { MicError, startRecording, type Recording, type RecordWay } from "./mic";
import { stopPlaying } from "./player";
import { MicIcon } from "./marks";

type Phase = { kind: "idle" } | { kind: "opening" } | { kind: "live"; since: number };

/**
 * The mic button: the mic is on only while it's held, and lets go by itself after
 * `maxSeconds`. Lifting the finger, a cancelled touch, or the page going out of sight
 * all end the take, and `onDone` gets what was recorded.
 */
export function HoldMic({
  label,
  maxSeconds,
  way,
  processing,
  disabled = false,
  onDone,
  onProblem,
  onLog,
}: {
  label: string;
  maxSeconds: number;
  way: RecordWay;
  processing: boolean;
  disabled?: boolean;
  onDone: (clip: Clip) => void;
  onProblem: (error: MicError) => void;
  onLog?: (line: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const recording = useRef<Recording | null>(null);
  const limit = useRef<number | undefined>(undefined);
  const latest = useRef({ onDone, onProblem, onLog, maxSeconds });
  useEffect(() => {
    latest.current = { onDone, onProblem, onLog, maxSeconds };
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

  const begin = (wayNow: RecordWay, processingNow: boolean) => {
    if (recording.current) return;
    stopPlaying();
    const rec = startRecording({ way: wayNow, processing: processingNow, onLog: latest.current.onLog });
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
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    begin(way, processing);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || e.repeat || (e.key !== " " && e.key !== "Enter")) return;
    e.preventDefault();
    begin(way, processing);
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") void end();
  };

  const held = phase.kind === "live" ? Math.max(0, Math.min(maxSeconds, (now - phase.since) / 1000)) : 0;
  return (
    <div className="ul-mic" data-phase={phase.kind}>
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
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <MicIcon width={30} height={30} />
        <span className="ul-mic-label">
          {phase.kind === "idle" ? label : phase.kind === "opening" ? "Wait…" : "Recording"}
        </span>
      </button>
      <div className="ul-mic-meter" aria-hidden="true">
        <span style={{ width: `${(held / maxSeconds) * 100}%` }} />
      </div>
      <p className="ul-mic-time" aria-live="polite">
        {phase.kind === "live"
          ? `${held.toFixed(0)} of ${maxSeconds} s`
          : phase.kind === "opening"
            ? "Turning the mic on"
            : `Up to ${maxSeconds} seconds`}
      </p>
    </div>
  );
}
