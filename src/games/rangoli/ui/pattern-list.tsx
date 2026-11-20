"use client";

import { cryptoRandom } from "@/party/logic/random";
import { formatDuration } from "@/ui/format";
import { CheckIcon, PlusIcon } from "@/ui/icons";

import { patternOf, phaseOf, type PatternRef } from "../logic/game";
import { ENDLESS_SIZES, type EndlessSize } from "../logic/generator";
import { PACKS } from "../logic/packs";
import { carryOn, drawingOf, TABS, type Tab } from "../logic/play";
import { drawnIn } from "../logic/progress";
import { describe } from "./drawing";
import { MiniPattern } from "./mini";
import { actPlay, useProgress, usePlay } from "./stores";

const TAB_NAMES: Record<Tab, string> = { easy: "Easy", medium: "Medium", hard: "Hard", endless: "Endless" };

const SIZES: Record<EndlessSize, { name: string; detail: string; sample: number }> = {
  small: { name: "Small", detail: "5×5 dots · 16 to 32 lines", sample: 5 },
  medium: { name: "Medium", detail: "7×7 dots · 32 to 56 lines", sample: 2 },
  large: { name: "Large", detail: "9×9 dots · 48 to 88 lines", sample: 3 },
};

/** The pattern list: the packs and Endless, every pattern open, the drawn ones in colour. */
export function PatternList() {
  const play = usePlay();
  const progress = useProgress();
  const { tab } = play;
  const carry = carryOn(play);
  const pack = PACKS.find((p) => p.id === tab);

  return (
    <div className="rg-list">
      <div className="rg-list-intro">
        <h1 className="game-title">Rangoli in one line</h1>
        <p className="game-blurb">Draw each pattern in one go: every line once, never twice.</p>
      </div>

      <div className="rg-list-bar">
        <div className="seg rg-tabs" role="radiogroup" aria-label="Patterns">
          {TABS.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={t === tab} onClick={() => actPlay({ type: "tab", tab: t })}>
              {TAB_NAMES[t]}
            </button>
          ))}
        </div>
        <p className="label rg-count">
          {pack ? `${drawnIn(progress, pack.patterns.map((p) => p.id))} of ${pack.patterns.length} drawn` : "A new pattern every time"}
        </p>
      </div>

      {pack ? (
        <ul className="rg-tiles">
          {pack.patterns.map(({ id, name, pattern }) => {
            const ref: PatternRef = { kind: "pack", id };
            const best = progress.best[id];
            const under = drawingOf(play, ref);
            const drawing = under && under.lines.length > 0 && phaseOf(under, pattern) !== "done" ? under : null;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={drawing ? "card rg-tile is-drawing" : "card rg-tile"}
                  onClick={() => actPlay({ type: "open", ref })}
                  aria-label={`${name}, ${best ? `drawn, best ${formatDuration(best.ms)}` : drawing ? `drawing, ${drawing.lines.length} of ${pattern.lines.length} lines` : `${pattern.lines.length} lines`}`}
                >
                  <MiniPattern pattern={pattern} coloured={Boolean(best)} />
                  <span className="rg-tile-name">{name}</span>
                  {drawing ? (
                    <span className="rg-chip is-drawing">
                      Drawing · {drawing.lines.length} of {pattern.lines.length}
                    </span>
                  ) : best ? (
                    <span className="rg-chip is-drawn">
                      <CheckIcon width={12} height={12} strokeWidth={3.4} />
                      <span className="rg-chip-num">{formatDuration(best.ms)}</span>
                    </span>
                  ) : (
                    <span className="rg-tile-count">{pattern.lines.length} lines</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="rg-sizes">
          {ENDLESS_SIZES.map((size) => {
            const { name, detail, sample } = SIZES[size];
            const record = progress.endless[size];
            const preview = patternOf({ kind: "endless", size, seed: sample })!;
            return (
              <li key={size} className="card rg-size">
                <MiniPattern pattern={preview} coloured className="rg-size-mini" />
                <div className="rg-size-text">
                  <h2>{name}</h2>
                  <p>{detail}</p>
                  <p className="rg-size-stats">
                    {record?.drawn ? `${record.drawn} drawn${record.best ? ` · best ${formatDuration(record.best.ms)}` : ""}` : "None drawn yet"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn rg-size-new"
                  aria-label={`New ${name.toLowerCase()} pattern`}
                  onClick={() => actPlay({ type: "open", ref: { kind: "endless", size, seed: Math.floor(cryptoRandom() * 2 ** 31) } })}
                >
                  <PlusIcon width={15} height={15} strokeWidth={2.8} />
                  New
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {carry && (
        <div className="rg-carry">
          <button type="button" className="btn btn-primary btn-big" onClick={() => actPlay({ type: "carry-on" })}>
            Carry on: {describe(carry.ref).name}
            <span className="rg-carry-count">
              {carry.lines.length}/{patternOf(carry.ref)!.lines.length}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
