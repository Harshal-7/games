"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

import { EyeOffIcon, LockIcon } from "@/ui/icons";

import { buzzOpen } from "./sounds";

/**
 * A secret card you have to hold to read: TOP SECRET on the back, the same for
 * everyone. Holding turns it face up; letting go, switching apps or the phone changing
 * hands hides it straight away, with no turn back. The secret is only in the page
 * while the card is held, and every press counts as an open, so a card someone else
 * peeked at shows "Opened" before its owner touches it.
 */
export function HoldCard({
  name,
  opens,
  buzz,
  onOpen,
  children,
}: {
  name: string;
  opens: number;
  /** A short buzz on every press (the room's Sound switch). */
  buzz: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  const [held, setHeld] = useState(false);

  // Hide when the page loses focus mid-hold (notification, app switch, lock screen).
  useEffect(() => {
    if (!held) return;
    const hide = () => setHeld(false);
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [held]);

  // Next keeps a page in the DOM when you leave it; never come back to a card left open.
  useLayoutEffect(() => () => setHeld(false), []);

  const show = () => {
    if (held) return;
    setHeld(true);
    if (buzz) buzzOpen();
    onOpen();
  };
  const hide = () => setHeld(false);
  const isKey = (key: string) => key === " " || key === "Enter";

  let label: string | undefined;
  if (!held) {
    label =
      opens === 0
        ? `${name}'s card. Press and hold to see it.`
        : `${name}'s card, opened${opens > 1 ? ` ${opens} times` : ""}. Press and hold to see it again.`;
  }

  return (
    <button
      type="button"
      className="imp-hold"
      data-state={held ? "held" : opens > 0 ? "opened" : "sealed"}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Without capture the card still hides on pointerup/cancel.
        }
        show();
      }}
      onPointerUp={hide}
      onPointerCancel={hide}
      onLostPointerCapture={hide}
      onKeyDown={(e) => {
        if (!isKey(e.key)) return;
        e.preventDefault();
        if (!e.repeat) show();
      }}
      onKeyUp={(e) => isKey(e.key) && hide()}
      onBlur={hide}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="imp-hold-turn">
        <span className="imp-back" aria-hidden="true">
          <span className="imp-back-secret">TOP SECRET</span>
          <span className="imp-back-for">For {name} only</span>
          <span className="imp-tape is-under">SEALED · SEALED · SEALED · SEALED</span>
          <span className="imp-tape">DON&apos;T PEEK · DON&apos;T PEEK · DON&apos;T PEEK</span>
          {opens === 0 ? (
            <span className="imp-back-note">
              <span className="imp-back-title">Sealed</span>
              Press and hold to open
            </span>
          ) : (
            <span className="imp-back-note is-opened">
              <span className="imp-back-stamp">{opens === 1 ? "Opened" : `Opened ${opens} times`}</span>
              Hold to see it again
            </span>
          )}
          <span className="imp-wax">
            {opens === 0 ? <LockIcon strokeWidth={2.4} /> : <EyeOffIcon strokeWidth={2.4} />}
            hold
          </span>
        </span>
        {held && (
          <span className="imp-face is-held" aria-live="assertive">
            {children}
          </span>
        )}
      </span>
    </button>
  );
}
