const CACHE_NAME = "engcards-v6";
const MEDIA_CACHE_NAME = "engcards-media-v1";
const DATA_CACHE_NAME = "engcards-data-v1";
const MAX_MEDIA_ITEMS = 150;

const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/decks",
  "/study",
  "/settings",
  "/import",
  "/export",
  "/manifest.json",
  "/offline.html",
];

const OFFLINE_URL = "/offline.html";

async function matchCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const exact = await cache.match(request);
  if (exact) return exact;
  return cache.match(request, { ignoreSearch: true });
}

async function putCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  try {
    await cache.put(request, response.clone());
  } catch {
    // Ignore cache write failures
  }
}

async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
    }
  } catch {
    // Ignore cache eviction errors
  }
}

function isMediaAsset(request) {
  const url = new URL(request.url);
  // 1. Audio cache route
  if (url.pathname.startsWith("/audio-cache/")) return true;
  // 2. Audio file extensions
  const ext = url.pathname.split(".").pop()?.toLowerCase() || "";
  if (["mp3", "wav", "ogg", "m4a", "webm"].includes(ext)) return true;
  // 3. Image CDNs or image file extensions
  if (
    url.hostname.includes("unsplash.com") ||
    url.hostname.includes("wikimedia.org") ||
    url.hostname.includes("images.pexels.com")
  ) {
    return true;
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(ext)) return true;
  if (request.destination === "image" || request.destination === "audio") return true;
  return false;
}

async function mediaCacheFirst(request) {
  const mediaCache = await caches.open(MEDIA_CACHE_NAME);
  const cached = await mediaCache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && (networkResponse.ok || networkResponse.type === "opaque")) {
      try {
        await mediaCache.put(request, networkResponse.clone());
        limitCacheSize(MEDIA_CACHE_NAME, MAX_MEDIA_ITEMS);
      } catch {
        // Ignore quota write failures
      }
    }
    return networkResponse;
  } catch {
    if (cached) return cached;
    return new Response("", { status: 408, statusText: "Offline media unavailable" });
  }
}

async function networkFirstApi(request) {
  const dataCache = await caches.open(DATA_CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      try {
        await dataCache.put(request, networkResponse.clone());
      } catch {
        // Ignore cache write failure
      }
    }
    return networkResponse;
  } catch {
    const cached = await dataCache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline - no cached data" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(() => cached);

  return cached || (await fetchPromise);
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await matchCache(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      // If navigating offline and exact page not in cache, try cached study or dashboard
      const cachedStudy = await matchCache(new Request("/study"));
      if (cachedStudy) return cachedStudy;
      const cachedDashboard = await matchCache(new Request("/dashboard"));
      if (cachedDashboard) return cachedDashboard;

      const offline = await matchCache(new Request(OFFLINE_URL));
      return offline || new Response("Offline", { status: 503 });
    }
    return new Response("Offline", { status: 503 });
  }
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  // Next.js immutable bundles
  if (url.pathname.startsWith("/_next/static/")) return true;
  const ext = url.pathname.split(".").pop() || "";
  return [".css", ".js", ".woff2", ".woff", ".ttf", ".ico", ".png", ".svg"].includes("." + ext);
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const validCaches = [CACHE_NAME, MEDIA_CACHE_NAME, DATA_CACHE_NAME];
      await Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Next.js page JSON data for client-side navigation
  if (url.pathname.includes("/_next/data/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2. Intercept read-only API routes for offline study capability
  if (
    url.pathname.startsWith("/api/reviews/due") ||
    url.pathname.startsWith("/api/decks") ||
    url.pathname.startsWith("/api/settings")
  ) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // 3. Never intercept mutating / auth API routes
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 4. Intercept and cache multimedia (Audio TTS & Images)
  if (isMediaAsset(request)) {
    event.respondWith(mediaCacheFirst(request));
    return;
  }

  // 5. Static assets (Next.js chunks, fonts, CSS)
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 6. Navigation requests (HTML pages)
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
  const cached = await matchCache(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await putCache(request, networkResponse);
    }
    return networkResponse;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
