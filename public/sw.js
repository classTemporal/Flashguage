const CACHE_NAME = "engcards-v4";

const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/study",
  "/settings",
  "/import",
  "/export",
  "/manifest.json",
];

const OFFLINE_URL = "/offline.html";

async function matchCache(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request);
}

async function putCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  try {
    await cache.put(request, response.clone());
  } catch {
    // Ignore cache write failures
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
      const offline = await matchCache(new Request(OFFLINE_URL));
      return offline || new Response("Offline", { status: 503 });
    }
    return new Response("Offline", { status: 503 });
  }
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  const ext = url.pathname.split(".").pop() || "";
  return [".css", ".js", ".woff2", ".woff", ".ttf", ".png", ".svg", ".ico"].includes("." + ext);
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
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
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
  // Never intercept or cache API routes or NextAuth routes
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

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
