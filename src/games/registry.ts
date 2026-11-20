import type { ComponentType } from "react";

import { HighwayBingoThumb } from "./highway-bingo/ui/thumb";
import { ImposterThumb } from "./imposter/ui/thumb";
import { KnightsTourBestBadge } from "./knights-tour/ui/best-badge";
import { KnightsTourThumb } from "./knights-tour/ui/thumb";
import { MafiaThumb } from "./mafia/ui/thumb";
import { PatakhaThumb } from "./patakha/ui/thumb";
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
];
