"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { EyeOffIcon, LockIcon } from "@/ui/icons";

import { buzzOpen } from "./sounds";

/**
 * A secret card you have to hold to read: the same sealed back for everyone, saying
 * how many times it's been opened. Holding turns it face up; letting go, switching apps or the phone changing
 * hands wipes the face straight away and the blank card turns back over. The secret is
 * only in the page while the card is held, and every press counts as an open, so a card
 * someone else peeked at shows "Opened" before its owner touches it.
 */
/** A press-and-hold: whether it's held, and the handlers for whatever is pressed. */
export type Hold = {
  held: boolean;
  press: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onLostPointerCapture: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
    onKeyUp: (e: KeyboardEvent<HTMLElement>) => void;
    onBlur: () => void;
    onContextMenu: (e: MouseEvent<HTMLElement>) => void;
  };
};

/**
 * The hold behind a secret card. A game can make its own and pass it to HoldCard, so a
 * second thing (a button under the card) opens the same card: every press counts as an
 * open either way. `onRelease` hears when a hold ends.
 */
export function useHold({
  buzz,
  onOpen,
  onRelease,
}: {
  buzz: boolean;
  onOpen: () => void;
  onRelease?: () => void;
}): Hold {
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
  const hide = () => {
    if (!held) return;
    setHeld(false);
    onRelease?.();
  };
  const isKey = (key: string) => key === " " || key === "Enter";

  return {
    held,
    press: {
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Without capture the card still hides on pointerup/cancel.
        }
        show();
      },
      onPointerUp: hide,
      onPointerCancel: hide,
      onLostPointerCapture: hide,
      onKeyDown: (e) => {
        if (!isKey(e.key)) return;
        e.preventDefault();
        if (!e.repeat) show();
      },
      onKeyUp: (e) => {
        if (isKey(e.key)) hide();
      },
      onBlur: hide,
      onContextMenu: (e) => e.preventDefault(),
    },
  };
}

export function HoldCard({
  name,
  opens,
  buzz,
  onOpen,
  hold,
  children,
}: {
  name: string;
  opens: number;
  /** A short buzz on every press (the game's Sound switch). */
  buzz: boolean;
  onOpen: () => void;
  /** The game's own hold (useHold), when something else can open the card too. */
  hold?: Hold;
  children: ReactNode;
}) {
  const own = useHold({ buzz, onOpen });
  const { held, press } = hold ?? own;

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
      {...press}
    >
      <span className="party-hold-turn">
        <span className="party-back" aria-hidden="true">
          <span className="party-back-top">
            <span className="party-back-stamp" data-opened={opens > 0 || undefined}>
              {opens === 0 ? "Sealed" : opens === 1 ? "Opened" : `Opened ${opens} times`}
            </span>
            <span className="party-back-for">For {name} only</span>
            <span className="party-back-hint">{opens === 0 ? "Press and hold to open" : "Hold to see it again"}</span>
          </span>
          <span className="party-tape is-under">SEALED · SEALED · SEALED · SEALED</span>
          <span className="party-tape">DON&apos;T PEEK · DON&apos;T PEEK · DON&apos;T PEEK</span>
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
