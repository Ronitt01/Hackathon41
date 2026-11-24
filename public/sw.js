// Kafila offline worker (T-6). Bump VERSION to drop every old cache on the next activate.
// shortcut: the static cache is never pruned, so old hashed chunks pile up; bump VERSION each deploy.
const VERSION = "v2";
const PAGES = `kafila-pages-${VERSION}`;
const STATIC = `kafila-static-${VERSION}`;
const KEEP = [PAGES, STATIC];
// Hill-station "lie-fi": connected but nothing comes back. Give up on the network after this and show the saved copy.
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add("/start")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kafila-") && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Only the home list and trip pages are worth keeping offline. */
function isPage(url) {
  return url.origin === self.location.origin && (url.pathname === "/start" || url.pathname.startsWith("/trips/"));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never touch auth, data or API traffic: Supabase and our own server routes always go to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event));
  } else if (request.mode === "navigate" && isPage(url)) {
    event.respondWith(networkFirst(event));
  }
});

// In-app <Link> moves are RSC fetches, not navigations, so the page asks us to save a full copy after each move.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-page" || typeof event.data.url !== "string") return;
  const url = new URL(event.data.url, self.location.origin);
  if (!isPage(url)) return;
  event.waitUntil(
    fetch(url.pathname, { credentials: "same-origin" })
      .then((response) => save(PAGES, url.pathname, response))
      .catch(() => {}),
  );
});

/** Store a good, non-redirected response (a signed-out bounce to home must not be saved under a trip URL). */
function save(cacheName, key, response) {
  if (!response.ok || response.redirected) return Promise.resolve();
  return caches
    .open(cacheName)
    .then((cache) => cache.put(key, response))
    .catch(() => {}); // Quota full or similar: the page still works online.
}

// Hashed build files never change under the same URL, so the cached copy is always right.
async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  event.waitUntil(save(STATIC, event.request, response.clone()));
  return response;
}

// Fresh page when online; the last good copy of that page (or the home page) when not, or when the network stalls.
async function networkFirst(event) {
  const { request } = event;
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("network timeout")), NETWORK_TIMEOUT_MS)),
    ]);
    event.waitUntil(save(PAGES, request, response.clone()));
    return response;
  } catch (error) {
    const cache = await caches.open(PAGES);
    const cached = (await cache.match(request, { ignoreVary: true, ignoreSearch: true })) || (await cache.match("/start", { ignoreVary: true }));
    if (cached) return cached;
    throw error;
  }
}
