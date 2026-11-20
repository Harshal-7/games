"use client";

import { useState, type ReactNode } from "react";

/** "Round 3" on the left, where the round is on the right. */
export function PlayHead({ round, label }: { round: number; label: string }) {
  return (
    <div className="party-play-head">
      <span className="party-round">Round {round}</span>
      <span className="party-play-label">{label}</span>
    </div>
  );
}

/** A name in big type. Long names step down a size or two so they fit a phone in one piece. */
export function BigName({ name }: { name: string }) {
  const size = name.length > 13 ? " is-long is-longer" : name.length > 9 ? " is-long" : "";
  return <h2 className={`party-big-name${size}`}>{name}</h2>;
}

/**
 * A rubber stamp ("Caught!") that drops in once. Next keeps visited pages in the
 * page and replays CSS animations when one shows again, so once the stamp has landed
 * it switches to a still class.
 */
export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  const [landed, setLanded] = useState(false);
  return (
    <span
      className={["party-stamp", landed ? null : "is-dropping", className].filter(Boolean).join(" ")}
      onAnimationEnd={() => setLanded(true)}
    >
      {children}
    </span>
  );
}
