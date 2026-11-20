import { lastNight, votedOut, winnerOf, type Room } from "./game";
import {
  callLine,
  dayLine,
  DUSK,
  END_LINES,
  morningLines,
  NOBODY_OUT,
  outLines,
  STORIES,
  VOTE_AGAIN_LINE,
  VOTE_LINE,
} from "./script";

/**
 * What the narrator says on the screen the room is on: the lines, and a key naming the
 * moment (game 2, night 3, the Doctor's call) so the same moment is never said twice,
 * however often the screen redraws. Null where there's nothing to say: the setup, the
 * deal and the moment before the night starts.
 */
export type Narration = { key: string; lines: string[] };

export function narration(room: Room): Narration | null {
  const game = room.game;
  if (!game) return null;
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? "Someone";
  const at = `${game.number}:${game.round}`;
  switch (game.stage) {
    case "deal":
      return null;
    case "night": {
      const night = game.night;
      if (!night || night.step === "ready") return null;
      if (night.step === "dusk") return { key: `${at}:dusk`, lines: [DUSK] };
      return { key: `${at}:${night.step}:${night.phase}`, lines: [callLine(night.step, night.phase)] };
    }
    case "morning": {
      const log = lastNight(game);
      const died = log?.died
        ? { name: name(log.died), role: game.roles[log.died], story: log.story ?? STORIES[0] }
        : null;
      return { key: `${at}:morning`, lines: morningLines(died) };
    }
    case "day":
      return { key: `${at}:day`, lines: [dayLine(room.options.talk)] };
    case "vote":
      return { key: `${at}:vote:${game.ties}`, lines: [game.ties > 0 ? VOTE_AGAIN_LINE : VOTE_LINE] };
    case "verdict": {
      const out = votedOut(game);
      return { key: `${at}:verdict`, lines: out ? outLines(name(out), game.roles[out]) : [NOBODY_OUT] };
    }
    case "end": {
      const winner = winnerOf(game);
      return winner ? { key: `${at}:end`, lines: [END_LINES[winner]] } : null;
    }
  }
}
