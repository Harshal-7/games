import { pickFair, settle, type Ledger } from "@/party/logic/fair";
import type { Limits } from "@/party/logic/players";
import type { Rng } from "@/party/logic/random";

/**
 * Who's who: the Mafia, a Doctor, the Police and Villagers for everyone else. Roles are
 * dealt with the fair ledger, one per role, so over a few games in the same room the
 * same cousin isn't Mafia (or the Doctor) every time.
 */

export type Role = "mafia" | "doctor" | "police" | "villager";
export const ROLES: readonly Role[] = ["mafia", "doctor", "police", "villager"];

/** The roles that wake up at night, in the order they're called. */
export type NightRole = "mafia" | "doctor" | "police";

export const LIMITS: Limits = { min: 5, max: 15 };

/** The Mafia choices on the setup screen: 1 to 4, or by table size. */
export const MAFIA_CHOICES = [1, 2, 3, 4] as const;

/** By table size: 5–6 → 1, 7–9 → 2, 10–13 → 3, 14–15 → 4. A starting point to tune after playing. */
export function autoMafia(players: number): number {
  if (players >= 14) return 4;
  if (players >= 10) return 3;
  if (players >= 7) return 2;
  return 1;
}

/** The Mafia always start outnumbered, or they'd win before the first night. */
export function maxMafia(players: number): number {
  return Math.max(1, Math.min(MAFIA_CHOICES.length, Math.floor((players - 1) / 2)));
}

/** How many Mafia a table gets: the choice (or the table-size default), never more than it can take. */
export function mafiaCount(players: number, wanted: number | null): number {
  return Math.max(1, Math.min(wanted ?? autoMafia(players), maxMafia(players)));
}

export type Cast = { mafia: number; doctor: boolean; police: boolean };

/** One fair-pick ledger per role. */
export type Ledgers = Record<NightRole, Ledger>;
export const NO_LEDGERS: Ledgers = { mafia: {}, doctor: {}, police: {} };

/**
 * Deals the roles: the Mafia from everyone, then the Doctor from the rest, then the
 * Police from who's left. Each pick leans towards whoever is owed a turn at that role.
 */
export function dealRoles(seats: readonly string[], cast: Cast, ledgers: Ledgers, rng: Rng): Record<string, Role> {
  const mafia = pickFair(seats, ledgers.mafia, cast.mafia, rng);
  let rest = seats.filter((id) => !mafia.includes(id));
  const doctor = cast.doctor ? pickFair(rest, ledgers.doctor, 1, rng) : [];
  rest = rest.filter((id) => !doctor.includes(id));
  const police = cast.police ? pickFair(rest, ledgers.police, 1, rng) : [];
  return Object.fromEntries(
    seats.map((id) => [
      id,
      mafia.includes(id) ? "mafia" : doctor.includes(id) ? "doctor" : police.includes(id) ? "police" : "villager",
    ]),
  );
}

/** Books a finished deal: each role's ledger, over the players it was picked from. */
export function settleRoles(seats: readonly string[], roles: Record<string, Role>, ledgers: Ledgers): Ledgers {
  const holders = (role: Role) => seats.filter((id) => roles[id] === role);
  const mafia = holders("mafia");
  const doctor = holders("doctor");
  const police = holders("police");
  const afterMafia = seats.filter((id) => !mafia.includes(id));
  const afterDoctor = afterMafia.filter((id) => !doctor.includes(id));
  return {
    mafia: settle(seats, ledgers.mafia, mafia),
    doctor: doctor.length > 0 ? settle(afterMafia, ledgers.doctor, doctor) : ledgers.doctor,
    police: police.length > 0 ? settle(afterDoctor, ledgers.police, police) : ledgers.police,
  };
}

export const ROLE_NAMES: Record<Role, string> = {
  mafia: "Mafia",
  doctor: "Doctor",
  police: "Police",
  villager: "Villager",
};

/** "Rohan was Mafia", "…was the Doctor", "…was the Police", "…was a Villager". */
export function roleAfterWas(role: Role): string {
  return role === "mafia" ? "Mafia" : role === "villager" ? "a Villager" : `the ${ROLE_NAMES[role]}`;
}

/** What each role does and how it wins: the line on its card. */
export const ROLE_LINES: Record<Role, string> = {
  mafia: "Each night, pick someone to take out. You win once you're as many as everyone else.",
  doctor: "Each night, save one person, even yourself, but never the same person two nights running. You win with the town.",
  police: "Each night, check one person and the phone tells you if they're Mafia. You win with the town.",
  villager: "No night job. Talk, watch and vote out the Mafia. You win with the town.",
};
