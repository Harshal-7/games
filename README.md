# Games

Small browser games, designed and built by Harshal Shinde. One Next.js app: each game
lives in its own folder and has its own page, and the home page lists them all.

| Game | Page | What it is |
| --- | --- | --- |
| Knight's Tour | `/knights-tour` | Move a chess knight to every square exactly once, on 5×5 to 8×8 boards. |
| Imposter | `/imposter` | Party game for one phone: everyone gets the secret word except the imposter. |

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # types, lint, tests and a production build
```

## How it is organised

```
src/
  app/                    pages (one folder per game) and the shared layout
  ui/                     pieces every game shares: page frame, top bar, buttons, icons
  home/                   the home page's saved-game card (Continue / New game / Remove) and styles
  settings/               the /settings page: theme, board and knight styles
  games/
    registry.ts           the list of games on the home page
    knights-tour/
      logic/              the rules and the solver, plain TypeScript with tests
      ui/                 the board, the play screen, the knight drawings
      styles.ts           the board and knight styles Settings offers
    imposter/
      logic/              rooms and rounds, fair picks, the word list, with tests
      ui/                 lobby, pass-the-phone deal, talk, vote and result screens
```

### Adding a game

1. Make `src/games/<name>/` with its `logic/` and `ui/`, and add its slug and name to
   `src/games/slugs.ts`.
2. Add `src/app/<name>/page.tsx` that wraps the game in `GameShell game="<slug>"`
   (`layout="party"` for games that scroll like a page).
3. Give it a colour: a `[data-game="<slug>"]` block in `src/app/globals.css`.
4. Add one entry to `src/games/registry.ts`.
5. If it has options for Settings, add its section to `GAME_SECTIONS` in
   `src/settings/settings-panel.tsx`. Settings shows the look plus the options of the game
   you opened it from, never every game's.

## The look

Design 4, "Game Night + Sticker": green felt, cream cards, a wooden board, Fraunces
titles, DM Sans for reading and DM Mono for numbers.

- **Felt and daylight.** Felt is the default and lives on `:root` in `globals.css`;
  `html[data-mode="light"]` repaints the same colour names as daylight (paper and ink).
  Settings offers Felt, Daylight and Match my phone.
- **Page or card.** Components use `--fg`, `--muted`, `--line`, `--ring` and `--bg`:
  they mean the page at the top level and ink on cream inside a `.card`, so one part
  reads right in both places.
- **One colour per game.** `GameShell` puts `data-game` on the page: brass for Knight's
  Tour, red for Imposter. The one main button on a screen (`.btn-primary`) takes the
  game's colour (`--game`); picked and on states take `--pick` (ink on site-wide pages).
- **Buttons.** Every button you tap is an outlined pill (`.btn`); each screen has one
  solid main button. Cards you read stay soft (`.card`).

## Knight's Tour notes

- **Solver.** Hint, the dead-end warning and Watch it solve all use one search
  (`logic/solver.ts`): depth first, fewest onward moves first (Warnsdorff's rule),
  with quick checks that prove a position hopeless early (square colours, dead-end
  squares, the colour of the forced last square, and squares that would split the
  board). It stops after a fixed number of steps so the page never freezes; on 8×8
  only a handful of very tangled positions come back as "can't tell".
- **Best times** are saved per board size in the browser (localStorage). Runs that
  Watch it solve finished don't count.
- **Settings** (theme, board, knight, what the board shows) are saved in the
  browser and put on `<html>` by a small script before the first paint, so nothing
  flashes. Settings is one tap away on every page. Opened from a game (`?from=`), it shows
  that game's options under the look and its Back returns to the game; opened from Home it
  shows only the look.
- **New board style**: add it to `styles.ts` and a `[data-kt-board="<id>"]` block
  (squares, frame, the letters on the frame; the same in felt and daylight) in
  `board-styles.css`. **New knight**: add it to `styles.ts` and draw it in
  `ui/knight-piece.tsx`.

## Imposter notes

- **Rounds.** Everything is one reducer over plain data (`logic/room.ts`), saved in the
  browser, so a reload mid-round comes back to the same screen.
- **Fair imposter picks** (`logic/fair.ts`) work like a shared bill: each round every
  player owes an even share of the imposter seats and being picked pays a turn off.
  Picks stay random but lean towards whoever is owed a turn, with a floor so nobody is
  ever ruled out. Who talks first is picked the same way, on its own, so it gives
  nothing away about the imposter.
- **No peeking.** Cards are sealed and only show while held. Every hold counts as an
  open and a card can't be sealed again or sent back to the pass-the-phone screen, so a
  peek at someone else's card always shows when its owner gets the phone. Re-deal gives
  everyone a new word without counting the round. Re-checking your card while talking
  is allowed, but everyone sees who did it. The word only enters the page while a card
  is held.
- **Words** (`logic/words.ts`): 10 categories, 30+ each, every word with a one-word hint
  for the imposter. No word repeats in a room until its category runs out, and the
  category changes every round.
