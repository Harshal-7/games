---
name: games-design
description: The games site's design rules (Design 4, "Game Night + Sticker", with table themes and big-screen layouts). Read this before any UI work in this repo, including a new game, a new screen, a restyle or a layout change, so the result matches the approved designs instead of inventing new ones.
---

# Designing in the games app

Harshal designs the look on a canvas first and approves it. Build what the canvas shows, from the parts that
already exist. Don't invent new visual styles, and don't iterate on looks in code.

## 1. Where the design lives

- **The canvas** (source of truth): https://claude.ai/artifact/KKiTXGViiiAjuhTYywdwjC. Read a board's source
  with the Artifact tool (`read`, `path`: `project/<Board>.dc.html`).
  - Page **Design 4**: every phone screen (`D4Home`, `D4Settings`, `D4Tour*`, `D4Quick`, `D4Setup`, `D4Card`,
    `D4Talk*`, `D4Forgot`, `D4Vote`, `D4Guess`, `D4Result`) and **Pieces and states** (`D4Parts`: every
    button, choice, label and confirm, with rest, picked, focus and disabled states).
  - Page **Design 4 · Web**: big screens (`WebSetup` with a `game` prop, `WebPlay`, `WebHome`,
    `WebSettings`, `WebTour`) and the colour themes (`WebThemes` and the themed setup examples).
- **The repo README**: "Shared parts for party games", "Adding a game", "Big screens" and "The look" say
  how the designs map to code. Keep them true when you change something.

## 2. How to work

1. **Find the closest existing screen** on the canvas and in the code, and build yours from the same parts,
   sizes and spacing.
2. **If a screen or element has no design** (a new kind of screen, a new visual piece, a new layout), don't
   improvise it in code. Draw it on the canvas (a new board next to the related ones, using the existing
   boards' tokens and parts), tell Harshal, and build it once he approves. Small variations of an existing
   pattern (another option row, another chip list) don't need this.
3. **Use only tokens and existing classes.** No hex colours in component CSS (only in the token blocks in
   `globals.css` and `[data-game]` / `[data-table]` blocks), no new font sizes or shadows when an existing one
   fits, no one-off button styles.
4. **Check before handing over** (see section 6), and say what you couldn't check.

## 3. The system

**Type**
- Fraunces (`--display`): titles, the main button (italic), names in big type.
- DM Sans (`--body`): everything you read.
- DM Mono (`--num`): numbers, timers, and small uppercase labels (about 11.5px, 0.12em letter spacing).
  It only has weights 400 and 500, with `font-synthesis: none`, so never ask it for bold.

**Colour**
- **Tables** (the page colour), from `src/settings/tables.ts` and `[data-table]` in `globals.css`:
  - Dark: Felt (Knight's Tour, Home, Settings), Midnight (Mafia), Asphalt (Highway Bingo), Studio (Ulta).
  - Light: Daylight, Blush (Imposter), Haldi (Patakha). Light tables set `html[data-tone="light"]` and
    use daylight's cards and shadows.
  - Only the page changes between tables; cards, buttons and the game's colour stay the same. Every screen
    must work on every table.
- **One colour per game**: a `[data-game]` block sets `--game`, `--game-deep`, `--on-game`, `--pick`,
  `--on-pick` and `--game-soft`. The one solid main button on a screen and picked/on states use it. Never use
  the game colour for small text on cream unless its `-deep` / `-ink` shade passes 4.5:1.
- **Page or card**: components use `--fg`, `--muted`, `--line`, `--ring`, `--bg`. At the top level they mean
  the page; inside `.card` they mean ink on cream. Write one part and it reads right in both places.
- Contrast: 4.5:1 for text, 3:1 for rings, outlines and timers. Pick shades that pass, on every table.

**Parts** (`src/app/globals.css`, `src/ui/`, `src/party/`)
- `.btn`: every small control you tap is an outlined pill (2.5px ink border, offset ink shadow).
- `.btn-primary`: one solid main button per screen, in `--game`, Fraunces italic.
- `.card` for reading; `.section`; `.tape` / `.tape-count` for the tilted section labels (cream "Players",
  game-coloured "Options"); `.label`, `.field-label`, `.field-note`.
- `.seg` (segmented choice), `.switch` / `.switch-row` / `.switches`, `.icon-btn`, 14px chips.
- `Confirm` (`src/ui/confirm.tsx`) for every "are you sure?": the safe choice first, focused.
- Icons: inline stroke SVG from `src/ui/icons.tsx`. Add new ones there in the same style. Emoji only where a
  game already uses them as content (category chips).
- Party parts (`src/party/`): `Roster`, `HoldCard` / `Face`, `RingTimer`, `Vote`, `PlayHead`, `BigName`,
  `Stamp`, sounds, `createStore`, `useLeaveGuard`. Use them; don't copy them.
- Home cards: a tilted `.card` with the game's art (`ui/thumb.tsx`, 92×124, the game's colour as a card
  back, simple inline SVG), name, blurb and a chip.
- Game title card (setup screens): the `.party-setup-title` pattern, the game's colour as the card with a
  cream pill holding the name (Fraunces italic) and a mono meta line.

**Layout**
- Phones first: build the phone screen to the D4 boards, then big screens.
- From 860px wide every page sits in one frame: 1184px at most, 48px either side.
- Party setup screens: the shared `.party-setup` layout (title row; left column with Players and the main
  button, pinned; Options in two columns). Play screens: `.party-play`, a centred 520px stage.
- Single-player board games: board on the left (up to 600px, never taller than the window), everything else
  beside it, like Knight's Tour.

**Motion and sound**
- Motion is small and physical (card flip, stamp drop, a slide). It switches off under
  `prefers-reduced-motion`. Next keeps visited pages alive and replays CSS animations, so one-off animations
  swap to a still class when they end.
- No starbursts, sparkles or ransom-note letters.
- Sounds come from `src/ui/sound.ts` (no audio files) and follow the game's Sound switch. iPhones can't
  vibrate from a web page.

**Words**
- Plain, friendly, short. Desi flavour where it fits, family-safe. Buttons say what happens
  ("Deal the cards", "Start the game").

## 4. A new game, visually

1. Pick its colour and its table. If none fits, propose them on the canvas first.
2. Add its `[data-game]` block, its `GAME_TABLES` line and its home card art.
3. Setup and play screens use the shared party layout, or the board layout for a single-player game.
4. Anything without a design yet goes on the canvas before it goes in code (section 2).

The repo README's "Adding a game" has the full code checklist.

## 5. Don'ts

- Don't add new colours, fonts, shadows, radii or button styles outside the token blocks.
- Don't restyle shared parts for one game. Ask instead, because it changes every game.
- Don't iterate on a look in code to see what Harshal thinks. Draw it on the canvas.
- Don't use `:has()` on `html` or `body` (Next keeps hidden pages in the DOM).

## 6. Before you hand over

- [ ] Phone width (390px) and a big screen (1280×800) both match their boards.
- [ ] Every table, or at least the game's own, Felt and Daylight.
- [ ] Keyboard focus visible, targets at least 44px, contrast passes.
- [ ] Reduced motion: nothing moves that shouldn't, and nothing is hidden.
- [ ] One solid main button per screen; no hard-coded colours.
- [ ] `pnpm check` passes. Say which device or screen size you didn't check.
