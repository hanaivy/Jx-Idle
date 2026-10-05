// Download the complete local app shell before offering an update to the player.
const C = 'jxidle-v20261005-v337';
const A = 'jxidle-assets-20261004-v2';
const scopeUrl = new URL('./', self.registration.scope);
const localUrl = value => {
  try {
    const url = new URL(value, scopeUrl);
    return url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname) ? url : null;
  } catch (_) { return null; }
};
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(m => [m[1].toLowerCase(), m[3]]));

async function cacheFresh(cache, url, required = false) {
  try {
    const request = new Request(url, { cache: 'reload', credentials: 'same-origin' });
    const response = await fetch(request);
    if (response.status !== 200) throw new Error(`Expected a complete response, got HTTP ${response.status}: ${url}`);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (required) throw error;
    return null;
  }
}
function cacheFullResponse(cache, request, response) {
  if (request.headers.has('range') || response.status !== 200) return Promise.resolve();
  return cache.put(request, response.clone()).catch(() => {});
}
async function cacheWebpOnce(cache, url) {
  const request = new Request(url, { credentials: 'same-origin' });
  if (!(await cache.match(request))) await cacheFresh(cache, url);
}

async function precacheAppShell() {
  const cache = await caches.open(C);
  const assetCache = await caches.open(A);
  const pageUrl = scopeUrl.href;
  const page = await cacheFresh(cache, pageUrl, true);
  const html = await page.clone().text();
  const styles = [];
  const required = new Set();
  const optional = new Set();

  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = attrs(match[0]);
    const ref = tag.src || tag.href;
    const url = ref && localUrl(ref);
    if (!url) continue;
    const isScript = match[1].toLowerCase() === 'script' && !!tag.src;
    const isStyle = match[1].toLowerCase() === 'link' && /stylesheet/i.test(tag.rel || '');
    (isScript || isStyle ? required : optional).add(url.href);
    if (isStyle) styles.push(url.href);
  }

  // Cache linked JS/CSS as a single required set: don't activate a partial update.
  await Promise.all([...required].map(url => cacheFresh(cache, url, true)));
  await Promise.all([...optional].map(url => /\.webp$/i.test(new URL(url).pathname)
    ? cacheWebpOnce(assetCache, url)
    : cacheFresh(cache, url)));

  // Also download local fonts and images referenced from stylesheets.
  const cssResponses = await Promise.all(styles.map(url => cache.match(url)));
  const cssAssets = new Set();
  for (let i = 0; i < cssResponses.length; i++) {
    const response = cssResponses[i];
    if (!response) throw new Error(`Missing stylesheet from app shell: ${styles[i]}`);
    const css = await response.text();
    for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
      const value = match[2].trim();
      if (!value || value.startsWith('data:')) continue;
      const url = localUrl(new URL(value, styles[i]).href);
      if (url) cssAssets.add(url.href);
    }
  }
  await Promise.all([...cssAssets].map(async url => {
    if (/\.webp$/i.test(new URL(url).pathname)) await cacheWebpOnce(assetCache, url);
    else {
      const request = new Request(url, { credentials: 'same-origin' });
      if (!(await cache.match(request))) await cacheFresh(cache, url);
    }
  }));
}

self.addEventListener('install', e => e.waitUntil(precacheAppShell()));
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k.startsWith('jxidle-') && k !== C && k !== A).map(k => caches.delete(k))))
  .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.headers.has('range')) {
    e.respondWith(fetch(e.request));
    return;
  }
  const path = new URL(e.request.url).pathname;
  if (path.includes('/api/chat/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  const isMapEditorAsset = /\/edit_map\.(?:html|js|css)$/.test(path);
  if (isMapEditorAsset) {
    const fresh = new Request(e.request, { cache: 'no-cache' });
    e.respondWith(fetch(fresh).then(async r => {
      await caches.open(C).then(c => cacheFullResponse(c, e.request, r));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  const isEditableMapSource = path.endsWith('/jmo.js');
  if (isEditableMapSource) {
    const fresh = new Request(e.request, { cache: 'no-cache' });
    e.respondWith(fetch(fresh).then(async r => {
      await caches.open(C).then(c => cacheFullResponse(c, e.request, r));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  const cacheName = /\.webp$/i.test(path) ? A : C;
  // The new worker's preloaded shell is authoritative after the player confirms
  // the update; this avoids the browser HTTP cache returning older JS/CSS.
  e.respondWith(caches.open(cacheName).then(cache => cache.match(e.request).then(cached => cached || fetch(e.request).then(async r => {
    await cacheFullResponse(cache, e.request, r);
    return r;
  }))).catch(() => caches.match(e.request)));
});
