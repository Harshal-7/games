"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

import { EyeOffIcon, LockIcon } from "@/ui/icons";

import { buzzOpen } from "./sounds";

/**
 * A secret card you have to hold to read: TOP SECRET on the back, the same for
 * everyone. Holding turns it face up; letting go, switching apps or the phone changing
 * hands wipes the face straight away and the blank card turns back over. The secret is
 * only in the page while the card is held, and every press counts as an open, so a card
 * someone else peeked at shows "Opened" before its owner touches it.
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
  /** A short buzz on every press (the game's Sound switch). */
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
      className="party-hold"
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
      <span className="party-hold-turn">
        <span className="party-back" aria-hidden="true">
          <span className="party-back-secret">TOP SECRET</span>
          <span className="party-back-for">For {name} only</span>
          <span className="party-tape is-under">SEALED · SEALED · SEALED · SEALED</span>
          <span className="party-tape">DON&apos;T PEEK · DON&apos;T PEEK · DON&apos;T PEEK</span>
          {opens === 0 ? (
            <span className="party-back-note">
              <span className="party-back-title">Sealed</span>
              Press and hold to open
            </span>
          ) : (
            <span className="party-back-note is-opened">
              <span className="party-back-stamp">{opens === 1 ? "Opened" : `Opened ${opens} times`}</span>
              Hold to see it again
            </span>
          )}
          <span className="party-wax">
            {opens === 0 ? <LockIcon strokeWidth={2.4} /> : <EyeOffIcon strokeWidth={2.4} />}
            hold
          </span>
        </span>
        {/* Always there, so letting go has a blank face to turn back from. */}
        <span className="party-face is-held" aria-live="assertive" aria-hidden={!held}>
          {held && children}
        </span>
      </span>
    </button>
  );
}

/** The three lines on a face-up card. */
export type FaceText = { kicker: string; word: string; note: string };

/**
 * A face-up card's lines; the card around them is styled by its class (.party-face, sized
 * with .is-wide or .is-small on the table). Every card shares one layout and one look, so
 * nobody across the table can tell them apart from a glance at the card.
 */
export function Face({ kicker, word, note }: FaceText) {
  return (
    <>
      <span className="party-face-kicker">{kicker}</span>
      <span className="party-face-word">{word}</span>
      <span className="party-face-note">{note}</span>
    </>
  );
}
