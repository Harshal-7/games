// Records Mafia's narrator: every line without a player's name in it
// (src/games/mafia/logic/lines.ts) in Kokoro's "Heart" voice, one MP3 per line in
// public/voice/heart/. Kokoro is an open-source voice model that runs on the laptop; the
// phones just play the files. Run it after changing any of those lines:
//   node scripts/record-narrator.mjs <python with kokoro-onnx> <folder with kokoro-v1.0.onnx and voices-v1.0.bin>
// Only missing clips are recorded (--all records every one again); clips no line uses are removed.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { CLIP_DIR, clipFile, FIXED_LINES, VOICE } from "../src/games/mafia/logic/lines.ts";

const [python, models] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (!python || !models) {
  console.error("usage: node scripts/record-narrator.mjs <python> <models folder> [--all]");
  process.exit(1);
}
const all = process.argv.includes("--all");
const out = join("public", CLIP_DIR);
mkdirSync(out, { recursive: true });

const wanted = new Map(FIXED_LINES.map((text) => [clipFile(text), text]));
const have = new Set(readdirSync(out).filter((file) => file.endsWith(".mp3")));
for (const file of have) {
  if (!wanted.has(file)) {
    rmSync(join(out, file));
    console.log("removed", file);
  }
}
const todo = [...wanted].filter(([file]) => all || !have.has(file)).map(([file, text]) => ({ file, text }));
if (todo.length === 0) {
  console.log(`all ${wanted.size} clips are there`);
  process.exit(0);
}
execFileSync(python, [join(import.meta.dirname, "record-narrator.py"), models, `af_${VOICE}`, out], {
  input: JSON.stringify(todo),
  stdio: ["pipe", "inherit", "inherit"],
});
