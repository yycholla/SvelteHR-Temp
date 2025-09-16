import { build, files, version } from '$service-worker';

/**
 * Service Worker for caching and offline support
 * Implements performance-optimized caching strategies
 */

// Create a unique cache name for this deployment
const CACHE_NAME = `mountainhr-v${version}`;

// Define different cache strategies
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// Files to precache (built assets and static files)
const PRECACHE_URLS = [
  ...build, // Built JS/CSS files
  ...files, // Static files from /static
  '/', // Root route
  '/offline' // Offline fallback page
];

// API endpoints to cache with different strategies
const API_PATTERNS = [
  /\/api\/auth\/me/, // User profile - cache with network first
  /\/api\/graphql/, // GraphQL queries - cache with network first
  /\/api\/metrics/, // Metrics - no cache (always fresh)
];

// Install event - precache static resources
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('📦 Service Worker: Installing');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Precaching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('🔄 Service Worker: Activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old cache versions
              return cacheName.startsWith('mountainhr-v') && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log(`🗑️  Service Worker: Deleting old cache ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim(); // Take control of existing pages
      })
      .catch((error) => {
        console.error('❌ Service Worker: Activation failed', error);
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different request types with different strategies
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request, url));
  } else {
    // For non-GET requests, just fetch from network
    event.respondWith(fetch(request));
  }
});

// Handle GET requests with appropriate caching strategy
async function handleGetRequest(request: Request, url: URL): Promise<Response> {
  // 1. Static assets - Cache First strategy
  if (isStaticAsset(request)) {
    return cacheFirst(request, STATIC_CACHE);
  }

  // 2. API requests - Network First with short cache
  if (isApiRequest(url)) {
    return networkFirstWithCache(request, API_CACHE);
  }

  // 3. HTML pages - Network First with fallback
  if (isHtmlRequest(request)) {
    return networkFirstWithFallback(request, DYNAMIC_CACHE);
  }

  // 4. Everything else - Network Only
  return fetch(request);
}

// Cache First - for static assets that don't change
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      // Return cached version immediately
      return cached;
    }
    
    // Fetch and cache if not found
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Cache First strategy failed:', error);
    return fetch(request);
  }
}

// Network First with Cache - for API requests
async function networkFirstWithCache(request: Request, cacheName: string): Promise<Response> {
  try {
    const cache = await caches.open(cacheName);
    
    try {
      // Try network first
      const response = await fetch(request);
      
      if (response.status === 200) {
        // Cache successful responses with short TTL
        const clonedResponse = response.clone();
        
        // Add timestamp to cached response for TTL
        const headers = new Headers(clonedResponse.headers);
        headers.set('sw-cache-timestamp', Date.now().toString());
        
        const modifiedResponse = new Response(clonedResponse.body, {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers
        });
        
        cache.put(request, modifiedResponse);
      }
      
      return response;
    } catch (networkError) {
      // Network failed, try cache
      const cached = await cache.match(request);
      
      if (cached) {
        // Check if cache is still fresh (5 minutes for API responses)
        const cacheTime = parseInt(cached.headers.get('sw-cache-timestamp') || '0');
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (now - cacheTime < maxAge) {
          console.log('📱 Service Worker: Serving API from cache (network failed)');
          return cached;
        }
      }
      
      throw networkError;
    }
  } catch (error) {
    console.error('Network First with Cache strategy failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Network First with Fallback - for HTML pages
async function networkFirstWithFallback(request: Request, cacheName: string): Promise<Response> {
  try {
    const cache = await caches.open(cacheName);
    
    try {
      // Try network first
      const response = await fetch(request);
      
      if (response.status === 200) {
        // Cache HTML pages
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (networkError) {
      // Network failed, try cache
      const cached = await cache.match(request);
      
      if (cached) {
        console.log('📱 Service Worker: Serving HTML from cache (offline)');
        return cached;
      }
      
      // If no cache, return offline page
      const offlinePage = await cache.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
      
      // Last resort - return generic offline message
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - MountainHR</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #dc2626; }
            p { color: #6b7280; line-height: 1.5; }
            button { 
              background: #2563eb; color: white; border: none; 
              padding: 0.75rem 1.5rem; border-radius: 0.5rem;
              cursor: pointer; font-size: 1rem;
            }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="offline">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>
              It looks like you're not connected to the internet. 
              Some features may not be available until you reconnect.
            </p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
        </html>
        `,
        { 
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
  } catch (error) {
    console.error('Network First with Fallback strategy failed:', error);
    return new Response('Service unavailable', { status: 503 });
  }
}

// Helper functions to identify request types
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.includes('/_app/') || 
         url.pathname.includes('/static/') ||
         /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/.test(url.pathname);
}

function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/');
}

function isHtmlRequest(request: Request): boolean {
  return request.headers.get('accept')?.includes('text/html') || false;
}

// Background sync for offline form submissions
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle queued form submissions when back online
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // Process any queued POST requests
    for (const request of requests) {
      if (request.method === 'POST') {
        try {
          await fetch(request);
          await cache.delete(request);
          console.log('✅ Service Worker: Queued request processed');
        } catch (error) {
          console.error('❌ Service Worker: Failed to process queued request', error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed', error);
  }
}

// Push notification handling (for future use)
self.addEventListener('push', (event: any) => {
  if (event.data) {
    const data = event.data.json();
    console.log('📣 Service Worker: Push notification received', data);
    
    const options = {
      body: data.body || 'New notification from MountainHR',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: data.tag || 'mountainhr-notification',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'MountainHR', options)
    );
  }
});

console.log('🚀 Service Worker: Initialized successfully');