"use client";

import { useEffect, useState, type ReactNode } from "react";

import { EyeOffIcon, LockIcon } from "@/ui/icons";

/**
 * A secret card you have to hold to read. Letting go, switching apps or the phone
 * changing hands hides it straight away. The secret is only in the page while the
 * card is held, and every press counts as an open, so a card someone else peeked
 * at shows "Opened" before its owner touches it.
 */
export function HoldCard({
  name,
  opens,
  onOpen,
  children,
}: {
  name: string;
  opens: number;
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

  const show = () => {
    if (held) return;
    setHeld(true);
    onOpen();
  };
  const hide = () => setHeld(false);
  const isKey = (key: string) => key === " " || key === "Enter";

  return (
    <button
      type="button"
      className="imp-hold"
      data-state={held ? "held" : opens > 0 ? "opened" : "sealed"}
      aria-label={held ? undefined : `${name}'s card. Press and hold to see it.`}
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
      {held ? (
        <span className="imp-face" aria-live="assertive">
          {children}
        </span>
      ) : opens > 0 ? (
        <span className="imp-cover">
          <span className="imp-seal is-broken">
            <EyeOffIcon width={26} height={26} />
          </span>
          <span className="imp-cover-title">{opens === 1 ? "Opened" : `Opened ${opens} times`}</span>
          <span className="imp-cover-note">Hold to see it again</span>
        </span>
      ) : (
        <span className="imp-cover">
          <span className="imp-seal">
            <LockIcon width={26} height={26} />
          </span>
          <span className="imp-cover-title">Sealed</span>
          <span className="imp-cover-note">Press and hold to open</span>
        </span>
      )}
    </button>
  );
}
