// The site's offline copy. src/offline/offline-worker.tsx registers it in production builds
// only, as /sw.js?v=<build>&page=/&page=/settings&… (the pages come from GAME_NAMES).
//
// Installing saves every page and every file they load into a cache named after the build,
// then takes over straight away and drops older copies. After that:
// - /_next/static files come from the cache first (their names change with every build).
// - Pages come from the network, or from the cache when it fails or takes over 3 seconds,
//   so a new deploy shows up on the next visit with signal.
// - Page data for links (RSC requests) only comes from the network. When that fails, Next
//   loads the page as a document instead, and that comes from the cache.
// Nothing personal goes in here: game saves stay in localStorage.

const params = new URL(self.location.href).searchParams;
const PREFIX = "games-";
const CACHE = PREFIX + params.get("v");
const PAGES = params.getAll("page");
const TIMEOUT_MS = 3000;
// After the network fails or times out, pages skip it for a while: on patchy signal a tap
// waits for the network once, not on every page.
const REST_MS = 30_000;
let restUntil = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(saveSite().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim().then(dropOldCopies));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event));
  } else if (request.headers.has("RSC") || url.searchParams.has("_rsc")) {
    event.respondWith(networkOnly(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

/** Every page, plus the files their HTML and stylesheets point to. Pages go in last. */
async function saveSite() {
  if (!params.get("v") || PAGES.length === 0) throw new Error("sw.js needs ?v= and at least one &page=");
  const cache = await caches.open(CACHE);
  const pages = await Promise.all(
    PAGES.map(async (page) => {
      const response = await fetch(page, { cache: "no-cache" });
      // A redirect would be a sign-in page (Vercel's preview protection), not ours.
      if (!response.ok || response.redirected) throw new Error(`${page} answered ${response.status}`);
      return { page, response, html: await response.clone().text() };
    }),
  );
  const files = new Set(pages.flatMap(({ html }) => filesIn(html)));
  await cache.addAll([...files]);
  const more = new Set();
  for (const file of files) {
    if (!/\.(css|webmanifest)$/.test(new URL(file, self.location.origin).pathname)) continue;
    const text = await (await cache.match(file)).text();
    for (const extra of filesFrom(file, text)) if (!files.has(extra)) more.add(extra);
  }
  await cache.addAll([...more]);
  await Promise.all(pages.map(({ page, response }) => cache.put(page, response)));
}

/** Build files anywhere in a page (tags and Next's RSC data), and its <link> files: icons, manifest. */
function filesIn(html) {
  const builds = html.match(/\/_next\/static\/[^"'\s<>\\)]+/g) ?? [];
  const links = [...html.matchAll(/<link\b[^>]*?\shref="(\/(?!\/)[^"]*)"/g)].map((match) => match[1]);
  return [...builds, ...links];
}

/** The files a stylesheet (fonts) or the manifest (icons) points to, relative to itself. */
function filesFrom(file, text) {
  const base = new URL(file, self.location.origin);
  const refs = base.pathname.endsWith(".css")
    ? [...text.matchAll(/url\(\s*["']?([^"')]+)/g)].map((match) => match[1])
    : (JSON.parse(text).icons ?? []).map((icon) => icon.src);
  return refs
    .map((ref) => new URL(ref, base))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.pathname + url.search);
}

/**
 * Deletes the copies of older builds. Not while another window is open, which may still show
 * an older page that needs its files: then they go when the next build takes over. A newer
 * build that's already saving its copy keeps it.
 */
async function dropOldCopies() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (windows.length > 1) return;
  const keep = [self.registration.installing, self.registration.waiting]
    .filter(Boolean)
    .map((worker) => PREFIX + new URL(worker.scriptURL).searchParams.get("v"));
  const old = (await caches.keys()).filter((name) => name.startsWith(PREFIX) && name !== CACHE && !keep.includes(name));
  await Promise.all(old.map((name) => caches.delete(name)));
}

/** Build files: the saved copy (from any build: names change with the contents), else the network. */
async function cacheFirst(event) {
  const saved = await caches.match(event.request, { ignoreSearch: true, ignoreVary: true });
  if (saved) return saved;
  const response = await fetch(event.request);
  if (response.ok) {
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
  }
  return response;
}

/** Pages: the network when it answers in time, else the saved copy (any ?from= is the same page). */
async function networkFirst(request) {
  const fetching = Date.now() < restUntil ? null : fetch(request);
  if (fetching) {
    const response = await inTime(fetching);
    if (response) return response;
  }
  const saved = await caches.match(request, { cacheName: CACHE, ignoreSearch: true, ignoreVary: true });
  // Nothing saved (a page we don't know): keep waiting for the network after all.
  return saved ?? fetching ?? fetch(request);
}

/** Page data: the network or a quick failure, which makes Next load the page as a document. */
async function networkOnly(request) {
  if (Date.now() < restUntil) return Response.error();
  return (await inTime(fetch(request))) ?? Response.error();
}

/**
 * The response, or null when the network fails or takes longer than TIMEOUT_MS. A null
 * starts a rest from the network (REST_MS); an answer in time ends it.
 */
async function inTime(fetching) {
  fetching.catch(() => {});
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(resolve, TIMEOUT_MS, null);
  });
  const response = await Promise.race([fetching, late]).catch(() => null);
  clearTimeout(timer);
  restUntil = response ? 0 : Date.now() + REST_MS;
  return response;
}
