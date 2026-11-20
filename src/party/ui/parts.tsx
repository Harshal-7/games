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

/** A name in big type. Long names step down a size so they fit a phone. */
export function BigName({ name }: { name: string }) {
  return <h2 className={name.length > 9 ? "party-big-name is-long" : "party-big-name"}>{name}</h2>;
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
