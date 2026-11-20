/**
 * The join link: the game's page with ?join=CODE. Opening it fills in the code on the Join
 * screen. The offline worker ignores the query, so it opens with no signal too, once the
 * game has been opened before.
 */

const PARAM = "join";

export function joinLink(code: string): string {
  return `${window.location.origin}/highway-bingo?${PARAM}=${encodeURIComponent(code)}`;
}

/** The code in this page's link, if it came from a join link. Null on the server. */
export function linkedCode(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(PARAM);
}

/** Takes ?join= off the address, so a reload doesn't open the Join screen again. */
export function clearLinkedCode(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(PARAM)) return;
  params.delete(PARAM);
  const rest = params.toString();
  window.history.replaceState(window.history.state, "", window.location.pathname + (rest ? `?${rest}` : ""));
}
