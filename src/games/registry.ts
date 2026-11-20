import type { ComponentType } from "react";

import { ImposterThumb } from "./imposter/ui/thumb";
import { KnightsTourThumb } from "./knights-tour/ui/thumb";

/** Every game on the site. Adding a game = a folder in src/games, a page, one entry here. */
export type GameEntry = {
  slug: string;
  name: string;
  blurb: string;
  detail: string;
  Thumb: ComponentType;
};

export const GAMES: GameEntry[] = [
  {
    slug: "knights-tour",
    name: "Knight's Tour",
    blurb: "Move a chess knight to every square exactly once.",
    detail: "5×5 to 8×8",
    Thumb: KnightsTourThumb,
  },
  {
    slug: "imposter",
    name: "Imposter",
    blurb: "Everyone gets the secret word except one. Find who's faking it.",
    detail: "3 to 20 players, one phone",
    Thumb: ImposterThumb,
  },
];
