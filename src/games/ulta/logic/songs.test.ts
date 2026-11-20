import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { drawSong, songKey, SONGS } from "./songs";

describe("songs", () => {
  it("has 150+ songs, mostly Bollywood, plus some English and regional", () => {
    expect(SONGS.length).toBeGreaterThanOrEqual(150);
    const share = (kind: string) => SONGS.filter((s) => s.kind === kind).length / SONGS.length;
    expect(share("bollywood")).toBeGreaterThan(0.6);
    expect(share("english")).toBeGreaterThan(0.05);
    expect(share("regional")).toBeGreaterThan(0.05);
  });

  it("has no title twice, whatever the spelling case or punctuation", () => {
    const plain = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    const seen = new Map<string, string>();
    for (const song of SONGS) {
      const key = plain(song.title);
      expect(seen.get(key), `${song.title} twice`).toBeUndefined();
      seen.set(key, song.title);
    }
  });

  it("keeps titles and sources short enough for the card", () => {
    for (const song of SONGS) {
      expect(song.title.length, song.title).toBeLessThanOrEqual(36);
      expect(song.title.trim(), song.title).toBe(song.title);
      expect(song.from.length, song.from).toBeLessThanOrEqual(32);
      expect(song.from.trim().length, song.title).toBeGreaterThan(0);
    }
  });

  it("leaves out anthems and devotional songs", () => {
    const banned = /jana gana|vande mataram|bhajan|aarti|bhagwan|allah|\brab\b|ram\b|krishna|shiv|om shanti/i;
    for (const song of SONGS) expect(song.title, song.title).not.toMatch(banned);
  });
});

describe("drawSong", () => {
  it("never repeats a song until all have been suggested, then starts over", () => {
    const rng = seeded(4);
    const used: string[] = [];
    for (let i = 0; i < SONGS.length; i++) {
      const key = songKey(drawSong(used, rng));
      expect(used).not.toContain(key);
      used.push(key);
    }
    expect(new Set(used).size).toBe(SONGS.length);
    expect(SONGS.map(songKey)).toContain(songKey(drawSong(used, rng)));
  });
});
