# Games

Small browser games, designed and built by Harshal Shinde. One Next.js app: each game
lives in its own folder and has its own page, and the home page lists them all.

| Game | Page | What it is |
| --- | --- | --- |
| Knight's Tour | `/knights-tour` | Move a chess knight to every square exactly once, on 5×5 to 8×8 boards. |

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
  ui/                     pieces every game shares: page frame, buttons, icons, theme
  games/
    registry.ts           the list of games on the home page
    knights-tour/
      logic/              the rules and the solver, plain TypeScript with tests
      ui/                 the board and the play screen
      skins.ts            board and piece styles
```

### Adding a game

1. Make `src/games/<name>/` with its `logic/` and `ui/`.
2. Add `src/app/<name>/page.tsx` that wraps the game in `GameShell`.
3. Add one entry to `src/games/registry.ts`.

## Knight's Tour notes

- **Solver.** Hint, the dead-end warning and Watch it solve all use one search
  (`logic/solver.ts`): depth first, fewest onward moves first (Warnsdorff's rule),
  with quick checks that prove a position hopeless early (square colours, dead-end
  squares, the colour of the forced last square, and squares that would split the
  board). It stops after a fixed number of steps so the page never freezes; on 8×8
  only a handful of very tangled positions come back as "can't tell".
- **Best times** are saved per board size in the browser (localStorage). Runs that
  Watch it solve finished don't count.
- **New piece or board styles**: add an entry to `skins.ts` and a
  `[data-skin="<id>"]` block of colours in `ui/knights-tour.css`.
