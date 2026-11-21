import type { ComponentType, SVGProps } from "react";

import { CrackTheCodeBadge } from "./crack-the-code/ui/badge";
import { CrackTheCodeThumb } from "./crack-the-code/ui/thumb";
import { FingerPickerMark } from "./finger-picker/ui/mark";
import { HighwayBingoThumb } from "./highway-bingo/ui/thumb";
import { ImposterThumb } from "./imposter/ui/thumb";
import { KnightsTourBestBadge } from "./knights-tour/ui/best-badge";
import { KnightsTourThumb } from "./knights-tour/ui/thumb";
import { MafiaThumb } from "./mafia/ui/thumb";
import { Make24Badge } from "./make-24/ui/badge";
import { Make24Thumb } from "./make-24/ui/thumb";
import { MarbleSolitaireBestBadge } from "./marble-solitaire/ui/best-badge";
import { MarbleSolitaireThumb } from "./marble-solitaire/ui/thumb";
import { PatakhaThumb } from "./patakha/ui/thumb";
import { NoLiftBadge } from "./no-lift/ui/badge";
import { NoLiftThumb } from "./no-lift/ui/thumb";
import { GAME_NAMES, type GameSlug } from "./slugs";
import { UltaThumb } from "./ulta/ui/thumb";

/** Every game on the site. Adding a game = a folder in src/games, a page, one entry here. */
export type GameEntry = {
  slug: GameSlug;
  name: string;
  blurb: string;
  /** Who plays and how big, on a chip under the blurb. */
  detail: string;
  Thumb: ComponentType;
  /** An extra chip that only the browser knows, like a best time. */
  Badge?: ComponentType;
};

/** A tool for every game (the Finger picker): a small tile under Home's games. */
export type ToolEntry = {
  slug: GameSlug;
  name: string;
  blurb: string;
  Mark: ComponentType<SVGProps<SVGSVGElement>>;
};

export const TOOLS: ToolEntry[] = [
  {
    slug: "finger-picker",
    name: GAME_NAMES["finger-picker"],
    blurb: "Who starts, who pays for chai, or make teams.",
    Mark: FingerPickerMark,
  },
];

export const GAMES: GameEntry[] = [
  {
    slug: "knights-tour",
    name: GAME_NAMES["knights-tour"],
    blurb: "Move a chess knight to every square exactly once.",
    detail: "1 player · 5×5 to 8×8",
    Thumb: KnightsTourThumb,
    Badge: KnightsTourBestBadge,
  },
  {
    slug: "imposter",
    name: GAME_NAMES.imposter,
    blurb: "Everyone gets the secret word except one. Find who's faking it.",
    detail: "3 to 20 players · one phone",
    Thumb: ImposterThumb,
  },
  {
    slug: "mafia",
    name: GAME_NAMES.mafia,
    blurb: "The phone narrates the night. Find the Mafia before they take over the town.",
    detail: "5 to 15 players · one phone",
    Thumb: MafiaThumb,
  },
  {
    slug: "patakha",
    name: GAME_NAMES.patakha,
    blurb: "Say an answer and pass the phone on before the hidden fuse runs out.",
    detail: "3 to 20 players · one phone",
    Thumb: PatakhaThumb,
  },
  {
    slug: "highway-bingo",
    name: GAME_NAMES["highway-bingo"],
    blurb: "Bingo cards of things you spot on Indian roads. The first full line wins.",
    detail: "2+ players · own phones",
    Thumb: HighwayBingoThumb,
  },
  {
    slug: "ulta",
    name: GAME_NAMES.ulta,
    blurb: "Sing a line, a teammate copies it backwards, and the team guesses the song.",
    detail: "4+ in two teams · one phone",
    Thumb: UltaThumb,
  },
  {
    slug: "no-lift",
    name: GAME_NAMES["no-lift"],
    blurb: "Draw each pattern in one go: every line once, never twice.",
    detail: "1 player · 30 patterns",
    Thumb: NoLiftThumb,
    Badge: NoLiftBadge,
  },
  {
    slug: "marble-solitaire",
    name: GAME_NAMES["marble-solitaire"],
    blurb: "Jump marbles over each other until only one is left.",
    detail: "1 player · 3 boards",
    Thumb: MarbleSolitaireThumb,
    Badge: MarbleSolitaireBestBadge,
  },
  {
    slug: "crack-the-code",
    name: GAME_NAMES["crack-the-code"],
    blurb: "Guess the secret code from right-place, wrong-place clues.",
    detail: "1 player · daily",
    Thumb: CrackTheCodeThumb,
    Badge: CrackTheCodeBadge,
  },
  {
    slug: "make-24",
    name: GAME_NAMES["make-24"],
    blurb: "Four numbers, + − × ÷, and 24 to make. Five new hands a day.",
    detail: "1 player · daily",
    Thumb: Make24Thumb,
    Badge: Make24Badge,
  },
];
