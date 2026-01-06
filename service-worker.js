const CACHE_NAME = "matrix-chat-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./index.css",

  "./login/login.html",
  "./login/login.js",
  "./login/login.css",

  "./sidebar/sidebar.html",
  "./sidebar/sidebar.js",
  "./sidebar/sidebar.css",

  "./chat/chat.html",
  "./chat/chat.js",
  "./chat/chat.css",

  "./user/user.html",
  "./user/user.js",
  "./user/user.css",

  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((cache) => {
        if (cache !== CACHE_NAME) return caches.delete(cache);
      }))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
