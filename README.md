# Games

Small browser games, designed and built by Harshal Shinde. One Next.js app: each game
lives in its own folder and has its own page, and the home page lists them all.

| Game | Page | What it is |
| --- | --- | --- |
| Knight's Tour | `/knights-tour` | Move a chess knight to every square exactly once, on 5×5 to 8×8 boards. |
| Imposter | `/imposter` | Party game for one phone: everyone gets the secret word except the imposter. |
| Mafia | `/mafia` | Party game for one phone, 5 to 15 players: the phone narrates the night, so nobody sits out. |
| Patakha | `/patakha` | Party game for one phone: say an answer and pass it on before the hidden fuse runs out. |
| Highway Bingo | `/highway-bingo` | Bingo cards of Indian road sights, on everyone's own phone with a shared code, or on one phone. |
| Ulta | `/ulta` | Party game for one phone: sing a line, a teammate copies it backwards, and the team guesses the song. |

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
  party/                  parts the party games share (below)
    logic/                random and fair picks, the player list, the timer, with tests
    ui/                   the saved-game store, clock, sounds, hold-to-see card, ring timer,
                          vote and player list; party.css styles them
  home/                   the home page's styles
  settings/               the /settings page: theme, board and knight styles
  offline/                the service worker's page list and the part that registers it
  games/
    registry.ts           the list of games on the home page
    knights-tour/
      logic/              the rules and the solver, plain TypeScript with tests
      ui/                 the board, the play screen, the knight drawings
      styles.ts           the board and knight styles Settings offers
    imposter/
      logic/              rooms and rounds, the word list, with tests
      ui/                 lobby, pass-the-phone deal, talk, vote and result screens
    mafia/
      logic/              roles, the timed night, votes, the narrator's script, with tests
      ui/                 setup, deal, the narrated night, day, vote and the end
    patakha/
      logic/              the room, the hidden fuse and its ticking, the prompt packs, with tests
      ui/                 setup, the burning fuse, the bang and the winner; the cracker drawing and sounds
    highway-bingo/
      logic/              the frozen sight lists, shared codes, the deal and lines, the room, with tests
      ui/                 setup, join and Check a card, the code, the card and the bingo; the milestone
    ulta/
      logic/              reversing and evening out recordings, the song list, the turns, with tests
      ui/                 setup and teams, the mic button, the turn screens; recordings kept in memory
```

### Shared parts for party games

A party game builds on `src/party/` instead of copying another game, so every game picks,
saves and times things the same way. The parts take plain inputs (ids, names, numbers and
callbacks), never a game's own types, and Imposter shows each one in use.

| Part | File | What it does |
| --- | --- | --- |
| `cryptoRandom`, `randomItem`, `randomId`, `seeded` | `logic/random.ts` | Random picks; `seeded` for tests |
| `pickFair`, `settle` | `logic/fair.ts` | The fair ledger, for anything that picks people round after round |
| `updatePlayers`, `nameProblem`, `tooFew` | `logic/players.ts` | The player list's changes and checks: 3 to 20 players, or a game's own limits |
| `Timer`, `changeTimer`, `timeLeft` | `logic/timer.ts` | A countdown kept as data: a deadline while it runs |
| `createStore(key, parse, reduce, empty)` | `ui/store.ts` | A game's state in localStorage, so a reload comes back to the same screen |
| `useClock`, `useHydrated` | `ui/use-clock.ts`, `ui/use-hydrated.ts` | A clock that ticks four times a second; whether the browser has loaded |
| `useWakeLock` | `ui/wake-lock.ts` | Keeps the screen on while a round is played (https only) |
| `wakeAudio`, `buzzOpen`, `tick`, `timeUp` | `ui/sounds.ts` | Party sounds, on top of `src/ui/sound.ts` |
| `Roster` | `ui/roster.tsx` | The player list on a setup screen: Quick start, add, rename in place, remove |
| `HoldCard`, `Face` | `ui/hold-card.tsx` | The hold-to-see secret card, and a face-up card's lines |
| `RingTimer` | `ui/ring-timer.tsx` | The ring timer with Pause and +30 sec |
| `Vote` | `ui/vote.tsx` | Point on three, tap who got the most fingers |
| `PlayHead`, `BigName`, `Stamp` | `ui/parts.tsx` | The round chip, a name in big type, a rubber stamp |

`src/ui/sound.ts` (all games) makes every sound with Web Audio: `playNotes` for tones,
`playNoise` for bursts of noise (Patakha's bang), and `soundLikeMedia` for games that are
mostly sound: it lets iPhones play through the silent switch, and pauses music in other apps.

`party.css` also holds the play screen these sit in: `.page.is-party`, `.party-play`
(which sizes the secret card), `.party-stage`, `.party-title`, `.party-help` and
`.party-foot`. Knight's Tour uses the clock and the store too.

### Adding a game

1. Make `src/games/<name>/` with its `logic/` and `ui/`, and add its slug and name to
   `src/games/slugs.ts`.
2. Add `src/app/<name>/page.tsx` that wraps the game in `GameShell game="<slug>"`
   (`layout="party"` for games that scroll like a page).
3. Give it a colour: a `[data-game="<slug>"]` block in `src/app/globals.css` (`--game`,
   `--game-deep`, `--on-game`, `--pick`, `--on-pick`, and `--game-soft` for soft fills).
   Give it a table too: its line in `GAME_TABLES` (`src/settings/tables.ts`); the type
   check asks for one. Its colour must keep 4.5:1 for text on that table.
4. Add one entry to `src/games/registry.ts`.
5. If it has options for Settings, add its section to `GAME_SECTIONS` in
   `src/settings/settings-panel.tsx`. Settings shows the look plus the options of the game
   you opened it from, never every game's.
6. A party game builds on `src/party/` (above): its entry component imports
   `@/party/ui/party.css` before its own styles, and it saves its state with `createStore`
   under `games:<slug>:<thing>:v1`.
7. Its main component calls `useLeaveGuard` (`src/ui/leave-guard.ts`). Leaving through
   "‹ Games" ends the game, keeping players and options; with a game under way it asks
   "Leave this game?" first. A reload, a locked phone or a trip to Settings doesn't end
   it, so it's still there when you come back.

## The look

Design 4, "Game Night + Sticker": green felt, cream cards, a wooden board, Fraunces
titles, DM Sans for reading and DM Mono for numbers.

- **Tables.** The page is a table colour, and each game sits on its own: Felt (Knight's
  Tour, Home and Settings), Midnight (Mafia), Asphalt (Highway Bingo), Studio (Ulta),
  Blush (Imposter) and Haldi (Patakha), plus Daylight, paper and ink. Only the page
  changes; cards, buttons and the game's colour stay the same.
  - `src/settings/tables.ts` lists the tables and every game's own (`GAME_TABLES`).
    Each table is a `[data-table="<id>"]` block in `globals.css` (page colour and
    texture, `--page-deep` for trays, text, muted text, lines, timer tracks). A test
    checks the two match and that the text passes 4.5:1 on the page and the trays.
  - Felt also lives on `:root`, so the server's paint is already right. Light tables
    set `html[data-tone="light"]`, which gives them daylight's cards and shadows;
    game CSS that needs a light-page tweak uses that too.
  - The settings script in `<head>` works out the table before the first paint, from
    the saved theme, the game in the path and the phone's light or dark setting, and
    sets `data-table`, `data-tone`, `color-scheme` and the `theme-color` meta.
    `SettingsSync` (root layout) applies it again when the path changes, in a layout
    effect, so moving between games never shows a frame of the old colour. Next keeps
    visited pages hidden in the page, so never pick colours with `:has()` on `html`.
  - Settings offers Each game's own (the default), any one table for every page, and
    Match my phone: Daylight whenever the phone is in light mode.
- **Page or card.** Components use `--fg`, `--muted`, `--line`, `--ring` and `--bg`:
  they mean the page at the top level and ink on cream inside a `.card`, so one part
  reads right in both places.
- **One colour per game.** `GameShell` puts `data-game` on the page: brass for Knight's
  Tour, red for Imposter. The one main button on a screen (`.btn-primary`) takes the
  game's colour (`--game`); picked and on states take `--pick` (ink on site-wide pages).
- **Buttons.** Every button you tap is an outlined pill (`.btn`); each screen has one
  solid main button. Cards you read stay soft (`.card`).

## Offline mode

The site installs like an app, and after one visit with signal every page opens and
plays with none.

- **Installing.** `src/app/manifest.ts` (full screen, felt green) and the icons:
  `public/icons/` for Android, `src/app/apple-icon.png` for iPhones. All are drawn from
  `src/app/icon.svg`; after changing it, run `node scripts/draw-icons.mjs` (needs Chrome).
- **The service worker** (`public/sw.js`) is registered by `src/offline/offline-worker.tsx`,
  in production builds only. On install it saves every page and every file they load, in a
  cache named after the build. The pages come from `GAME_NAMES` (`src/offline/pages.ts`),
  so a new game is saved without anyone listing it; a test checks the list against the
  pages in `src/app`.
  - Build files (`/_next/static`) come from the cache first.
  - Pages come from the network, or from the cache after 3 seconds or a failure. After a
    failure the network gets a 30-second rest, so patchy signal costs one wait, not one
    per tap.
  - Page data for links (`?_rsc=`) only comes from the network. When that fails, Next
    loads the page as a document instead, and the cache serves it.
- **Updates.** Each build registers `/sw.js?v=<build time>`, so the first visit with signal
  after a deploy saves the new copy, takes over and deletes the old one (or leaves it until
  the next deploy if another window may still show an older page).
- **Saves** stay in localStorage, never in the cache.
- **Development.** `pnpm dev` registers nothing and removes any worker it finds: a worker
  left on localhost:3000 would answer for whichever project runs there next. To try
  offline mode on the laptop, run the production build on another port
  (`pnpm build && pnpm start -p 3999`), visit once, stop the server and reload. Running
  `pnpm dev -p 3999` once afterwards removes that worker.

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
- **Fair imposter picks** (`src/party/logic/fair.ts`) work like a shared bill: each round every
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

## Mafia notes

- **Games.** One reducer over plain data (`logic/game.ts`), saved as
  `games:mafia:room:v1`, so a reload comes back to the same step, even mid-night.
- **The night runs on the clock.** Every role's turn lasts at least 10 seconds plus a
  random 0 to 5, however fast its tap, and a Doctor or Police who is out is still called
  with the same wait, so the timing gives nothing away. The screen ticks the reducer with
  `Date.now()`; nothing counts intervals. Each role's screen starts clean, so the Doctor
  and the Police never see the Mafia's pick.
- **The narrator** (`ui/narrator.ts`). Every line without a player's name (the night
  scenes, the calls, the day and the end, listed in `logic/lines.ts`) is a recording in
  the "Heart" voice of Kokoro, an open-source voice model, in `public/voice/heart/` (32
  small MP3s, about 700 KB). They play through Web Audio and the offline worker saves them
  with the page. Lines with names (the morning's story, who's out) use the phone's own
  voice (`speechSynthesis`): the best American English one, or the one picked in Options.
  What's said at each moment comes from `logic/narration.ts`, keyed so nothing is said
  twice. Phones only make sound after a tap, so the night starts from one, and after a
  reload mid-night Carry on says the last line again with a fresh wait. On iPhones the page
  asks for the playback audio session (Safari 17+), so the silent switch doesn't mute it.
- **Changing a recorded line**: edit `logic/lines.ts`, then record it again on the laptop
  (needs Python with `kokoro-onnx`, the Kokoro model files and ffmpeg):
  `node scripts/record-narrator.mjs <python> <models folder>`. A test fails while any line
  is missing its clip.
- **The screen stays on** (Screen Wake Lock, https only) from the first night to the last
  vote.
- **Fair roles.** One fair-pick ledger per role, booked once everyone has seen their card.
- **Words** (`logic/script.ts`): four night scenes taken in turn (the classic night, a
  power cut, the monsoon, the night after the match), each still calling every role to
  open and close their eyes by name, and 40 morning stories with a `{name}` slot. No
  story repeats in a room until they've all been told.
- **Night sound** (`ui/night-sound.ts`): a soft hush and the odd cricket in Web Audio,
  under the Sound switch, to cover the sound of someone leaning in to tap.

## Patakha notes

- **Rounds.** One reducer over plain data (`logic/room.ts`), saved as `games:patakha:room:v1`.
  The first holder of each game is a fair pick; after that the loser lights the next round, or
  the next player still in if that loss knocked them out. Players who are out are skipped.
- **The hidden fuse** (`logic/fuse.ts`) burns for a random time (short 10–25 s, normal 20–50 s,
  long 30–60 s) and runs off a deadline. Nothing on screen depends on the time left: the spark
  flickers at one pace and the fuse never burns down. Only the ticking changes: a little quicker
  the longer it burns (by time burned, never time left), then much faster from a random point
  3 to 9 seconds before the end.
- **No accidental taps.** Pass ignores a tap within 300 ms of the last pass (or of lighting and
  resuming), and Light it waits a second after the bang, so a frantic last Pass can't skip
  anyone or light the next fuse.
- **Pausing.** Locking the phone, switching apps, reloading or leaving the page (Settings, the
  games list) pauses the fuse. The prompt hides until Resume, and that tap wakes the sound and
  the screen lock again.
- **Sound.** Ticks, the bang (a crack, a boom and crackles from `playNoise`, peaking near 0.8 of
  full scale) and the buzz all follow the Sound switch. Light it, Pass and Resume each wake the
  sound, as iPhones need. Setup has Test sound for checking a phone before playing.
- **Prompts** (`logic/prompts.ts`): 4 packs, 135 prompts, each with at least 15 easy answers.
  None repeats in a room until the packs run out. Answers in any language by default; English
  only is a table rule shown on the play screen, and the table judges.

## Highway Bingo notes

- **Shared codes, nothing sent.** A code like `CHAI-42` carries everything a phone needs: the
  word belongs to one edition (a pack and its sight list version, `logic/code.ts`) and the digits
  pick the size (even 5×5, odd 4×4). Each phone hashes the code, seat, pack, version and size
  into a seed for `seeded()` and deals from it (`logic/card.ts`), so the same code and seat give
  the same card on every phone, with no signal. A word this copy doesn't know (a newer edition)
  asks the phone to update rather than dealing a wrong card.
- **Sight lists are frozen once shipped.** Editing `HIGHWAY_V1`, or the hash, shuffle or order of
  the deal, changes every card for every code. Tests pin the list and one deal. To change a pack,
  add `HIGHWAY_V2` with its own code words in `EDITIONS` and keep v1. New games use the newest
  edition; old codes keep dealing their own.
- **Every card has the same mix**: 10 easy, 10 medium and 4 rare sights on 5×5 (7 / 7 / 2 on 4×4),
  no repeats, and the free middle on 5×5. Labels are 2–4 words, no word over 9 letters, so a
  square never breaks mid-word on a small phone.
- **Seats** are 1 to 20; whoever starts is seat 1. It runs on trust: anyone can type any seat,
  and two phones on the same seat get the same card. Check a card (on the setup screen) opens any
  seat's card from the code to check a Bingo! claim.
- **Join links.** The code screen (or Invite on the card) shares `/highway-bingo?join=CODE` through
  the phone's share sheet, or copies it. Opening it brings up Join with the code filled in, then
  takes `?join=` off the address so a reload doesn't ask again. The offline worker ignores the
  query, so a link opens with no signal on a phone that has opened the game before.
- **Saves.** `games:highway-bingo:room:v1` keeps the options, the game on screen and the marks of
  the last 30 cards, per code and seat, so a reload, or joining the same code and seat again,
  brings them back. Leaving through "‹ Games" ends the game (asking first once a square is marked)
  but keeps the marks.
- **Sound** follows the Sound switch: a stamp, a tick for unmarking, and two honks and a fanfare
  for a bingo (with a buzz on Android). It doesn't ask iPhones to play through the silent switch,
  which would pause the car's music, so an iPhone on silent stays quiet.
- **The screen stays on** while a card is open (Options → Keep the screen on, https only).

## Ulta notes

- **Turns.** One reducer over plain data (`logic/room.ts`), saved as `games:ulta:room:v1`. From 4
  players it's two teams, Seedha and Ulta (tap a name to move it, or shuffle), playing to 5, 7 or 10;
  2 or 3 players play for fun with no score. Teams take turns; inside a team the singer is the next in
  line and the copier the one after, so everyone sings and copies equally. The copier hears the line
  backwards up to 3 times, the team gets 45 seconds on the ring timer, and a miss gives the other team
  one guess to steal. The singer judges.
- **Recordings never leave the page's memory** (`ui/takes.ts`): not in the saved room, not in the
  offline cache, never uploaded, and dropped when the turn ends. A reload loses them, so a turn that
  still needs one goes back to singing and says why.
- **The mic** (`ui/mic.ts`) is on only while the button is held. It records with `MediaRecorder` and
  decodes the file in an `OfflineAudioContext` (iPhones record mp4/AAC, Android webm/Opus); without
  `MediaRecorder` it copies raw samples out of an AudioWorklet. The phone's speech clean-up (echo,
  noise, auto volume) is off, as it mangles singing. Mic blocked, mic busy (a call), no mic and
  too-short or silent takes each get their own message. Setup has a mic check, so the permission prompt
  comes before the first turn.
- **The sound** (`logic/audio.ts`): each take is trimmed of silence at both ends, flipped back to front
  by copying the samples in reverse, and turned up to an even level (steered by the loudness that 0.5%
  of samples go above, at most +30 dB, peaks rounded off), so a quiet copy still plays loud. Playing
  asks iPhones for the playback audio session first, which plays through the silent switch and the
  loudspeaker rather than the earpiece the mic uses.
- **Songs** (`logic/songs.ts`): 253 titles with the film or singer, mostly Bollywood from the 50s to
  now plus some English and regional hits; titles only, no lyrics or music, no anthems or devotional
  songs. "Suggest one" shows the song on the hold-to-see card, and none repeats in a room until the list
  runs out.
