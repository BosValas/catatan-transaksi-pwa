const CACHE_NAME = 'currency-tracker-cache-v1';
const APP_SHELL_FILES = [
    '/', // Alias for index.html at root
    '/index.html',
    '/index.css',
    '/index.tsx', // Main application script
    '/manifest.json',
    '/icon.svg'     // Main SVG icon
    // Note: CDN resources like esm.sh for React will be cached dynamically by the fetch handler if they have proper CORS headers.
];

// Install event: cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(APP_SHELL_FILES);
            })
            .catch(err => {
                console.error('Service Worker: Failed to cache app shell files during install:', err);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activated and old caches cleaned.');
            return self.clients.claim(); // Ensure new SW takes control immediately on activation
        })
    );
});

// Fetch event: serve from cache first, then network. Cache successful GET network responses.
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Cache hit - return response
                if (cachedResponse) {
                    // console.log('Service Worker: Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // Not in cache - fetch from network
                // console.log('Service Worker: Fetching from network:', event.request.url);
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200) {
                             // Do not cache error responses or opaque responses unless sure
                            if (networkResponse && networkResponse.type === 'opaque') {
                                // Opaque responses (e.g. no-cors requests to CDNs) can be used but not inspected or modified
                                // Caching them is fine for offline use if the CDN allows it.
                            } else {
                                console.warn('Service Worker: Network response was not ok or not cacheable for:', event.request.url, networkResponse ? networkResponse.status : 'no response');
                                return networkResponse;
                            }
                        }
                        
                        // Clone the response to cache it for future use.
                        // A response is a stream and can only be consumed once.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // console.log('Service Worker: Caching new resource:', event.request.url);
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    }
                ).catch((error) => {
                    console.error('Service Worker: Fetching failed for:', event.request.url, error);
                    // Optionally, return a fallback offline page/resource here if appropriate.
                    // For example, if it's an image request, return a placeholder image.
                    // if (event.request.destination === 'image') {
                    //    return caches.match('/placeholder-image.png');
                    // }
                    // For now, let the browser handle the error (e.g. display its offline page)
                });
            })
    );
});
