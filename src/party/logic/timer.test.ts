import { describe, expect, it } from "vitest";

import { changeTimer, ringFraction, tickDue, timeLeft, timerTone, type Timer } from "./timer";

describe("the ring timer", () => {
  it("hurries at 30 seconds or less", () => {
    expect(timerTone(180_000)).toBe("calm");
    expect(timerTone(30_001)).toBe("calm");
    expect(timerTone(30_000)).toBe("hurry");
    expect(timerTone(0)).toBe("hurry");
  });

  it("draws the ring as a share of the total, never more than full", () => {
    expect(ringFraction(90_000, 180_000)).toBe(0.5);
    expect(ringFraction(0, 180_000)).toBe(0);
    // +30 sec at 2:45 of 3:00 leaves 3:15: the ring stays full.
    expect(ringFraction(195_000, 180_000)).toBe(1);
    expect(ringFraction(-5, 180_000)).toBe(0);
    expect(ringFraction(5_000, 0)).toBe(0);
  });

  it("pauses, resumes and adds time off a deadline", () => {
    let timer: Timer = { endsAt: 180_000, left: 180_000 };
    timer = changeTimer(timer, "pause", 60_000);
    expect(timer).toEqual({ endsAt: null, left: 120_000 });
    timer = changeTimer(timer, "add", 90_000);
    expect(timeLeft(timer, 99_000)).toBe(150_000);
    timer = changeTimer(timer, "resume", 100_000);
    expect(timeLeft(timer, 110_000)).toBe(140_000);
    // Resuming at zero does nothing; +30 sec starts a finished timer again.
    const done: Timer = { endsAt: 5_000, left: 0 };
    expect(changeTimer(done, "resume", 9_000)).toBe(done);
    expect(changeTimer(done, "add", 9_000)).toEqual({ endsAt: 39_000, left: 30_000 });
  });

  it("ticks once a second from 10 to 1 with the 250 ms clock", () => {
    const ticks: number[] = [];
    for (let left = 12_000; left > 0; left -= 250) {
      const next = Math.max(0, left - 250);
      if (tickDue(left, next)) ticks.push(Math.ceil(next / 1000));
    }
    expect(ticks).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it("stays quiet when paused, when time goes up and when time runs out", () => {
    expect(tickDue(5_000, 5_000)).toBe(false);
    expect(tickDue(4_200, 34_200)).toBe(false);
    expect(tickDue(800, 0)).toBe(false);
    expect(tickDue(11_000, 10_500)).toBe(false);
  });

  it("ticks only once when a background tab wakes several seconds later", () => {
    expect(tickDue(15_000, 3_400)).toBe(true);
    // Still 0:04, then on to 0:03 as usual.
    expect(tickDue(3_400, 3_150)).toBe(false);
    expect(tickDue(3_150, 2_900)).toBe(true);
  });
});
