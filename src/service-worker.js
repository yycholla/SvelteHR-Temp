/**
 * Service Worker for MountainHR Frontend
 * Provides caching strategies and offline support
 */

import { build, files, version } from '$service-worker';

// Cache names
const CACHE_NAME = `mountainhr-cache-${version}`;
const STATIC_CACHE = `mountainhr-static-${version}`;
const DYNAMIC_CACHE = `mountainhr-dynamic-${version}`;
const API_CACHE = `mountainhr-api-${version}`;

// Assets to cache
const staticAssets = [
	...build, // Generated build files
	...files  // Static files from /static
];

// API endpoints to cache
const API_ENDPOINTS = [
	'/api/v2/auth/verify',
	'/api/v2/employees',
	'/api/v2/departments',
	'/api/v2/communications'
];

// Cache strategies
const CACHE_STRATEGIES = {
	CACHE_FIRST: 'cache-first',
	NETWORK_FIRST: 'network-first',
	STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
	console.log('[SW] Installing service worker');
	
	event.waitUntil(
		Promise.all([
			// Cache static assets
			caches.open(STATIC_CACHE).then((cache) => {
				console.log('[SW] Caching static assets');
				return cache.addAll(staticAssets);
			}),
			
			// Skip waiting to activate immediately
			self.skipWaiting()
		])
	);
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
	console.log('[SW] Activating service worker');
	
	event.waitUntil(
		Promise.all([
			// Clean up old caches
			caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((cacheName) => {
							return (
								cacheName.startsWith('mountainhr-') &&
								!cacheName.endsWith(`-${version}`)
							);
						})
						.map((cacheName) => {
							console.log('[SW] Deleting old cache:', cacheName);
							return caches.delete(cacheName);
						})
				);
			}),
			
			// Take control of all clients
			self.clients.claim()
		])
	);
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== 'GET') {
		return;
	}

	// Handle different types of requests
	if (url.pathname.startsWith('/api/')) {
		// API requests - network first with cache fallback
		event.respondWith(handleAPIRequest(request));
	} else if (isStaticAsset(url.pathname)) {
		// Static assets - cache first
		event.respondWith(handleStaticAsset(request));
	} else if (isPageRequest(request)) {
		// Page requests - stale while revalidate
		event.respondWith(handlePageRequest(request));
	} else {
		// Other requests - network first
		event.respondWith(handleNetworkFirst(request));
	}
});

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
	const cacheName = API_CACHE;
	
	try {
		// Try network first
		const networkResponse = await fetch(request.clone());
		
		if (networkResponse.ok) {
			// Cache successful responses
			const cache = await caches.open(cacheName);
			cache.put(request.clone(), networkResponse.clone());
		}
		
		return networkResponse;
	} catch (error) {
		console.log('[SW] Network failed for API request, trying cache');
		
		// Fallback to cache
		const cachedResponse = await caches.match(request);
		if (cachedResponse) {
			return cachedResponse;
		}
		
		// Return offline fallback for critical API endpoints
		if (isCriticalAPIEndpoint(request.url)) {
			return new Response(
				JSON.stringify({
					error: 'Offline',
					message: 'This data is not available offline'
				}),
				{
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
		
		throw error;
	}
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
	const cache = await caches.open(STATIC_CACHE);
	const cachedResponse = await cache.match(request);
	
	if (cachedResponse) {
		return cachedResponse;
	}
	
	// If not in cache, fetch and cache
	try {
		const networkResponse = await fetch(request);
		if (networkResponse.ok) {
			cache.put(request, networkResponse.clone());
		}
		return networkResponse;
	} catch (error) {
		console.log('[SW] Failed to fetch static asset:', request.url);
		throw error;
	}
}

/**
 * Handle page requests with stale-while-revalidate strategy
 */
async function handlePageRequest(request) {
	const cache = await caches.open(DYNAMIC_CACHE);
	const cachedResponse = await cache.match(request);
	
	// Return cached version immediately (if available)
	const fetchPromise = fetch(request.clone())
		.then((networkResponse) => {
			if (networkResponse.ok) {
				cache.put(request.clone(), networkResponse.clone());
			}
			return networkResponse;
		})
		.catch(() => {
			// Network failed, return offline page if available
			return caches.match('/offline') || new Response(
				'<h1>Offline</h1><p>You are currently offline. Please check your connection.</p>',
				{ headers: { 'Content-Type': 'text/html' } }
			);
		});
	
	return cachedResponse || fetchPromise;
}

/**
 * Handle other requests with network-first strategy
 */
async function handleNetworkFirst(request) {
	try {
		return await fetch(request);
	} catch (error) {
		const cachedResponse = await caches.match(request);
		return cachedResponse || Promise.reject(error);
	}
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
	return (
		pathname.startsWith('/_app/') ||
		pathname.startsWith('/assets/') ||
		pathname.includes('.') // Files with extensions
	);
}

/**
 * Check if request is for a page
 */
function isPageRequest(request) {
	return request.mode === 'navigate';
}

/**
 * Check if API endpoint is critical
 */
function isCriticalAPIEndpoint(url) {
	return API_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
	console.log('[SW] Background sync:', event.tag);
	
	if (event.tag === 'background-sync-communications') {
		event.waitUntil(syncCommunications());
	}
	
	if (event.tag === 'background-sync-employee-updates') {
		event.waitUntil(syncEmployeeUpdates());
	}
});

/**
 * Sync pending communications
 */
async function syncCommunications() {
	try {
		// Get pending communications from IndexedDB
		const pendingComms = await getPendingCommunications();
		
		for (const comm of pendingComms) {
			try {
				const response = await fetch('/api/v2/communications', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${comm.token}`
					},
					body: JSON.stringify(comm.data)
				});
				
				if (response.ok) {
					await removePendingCommunication(comm.id);
					console.log('[SW] Synced communication:', comm.id);
				}
			} catch (error) {
				console.log('[SW] Failed to sync communication:', error);
			}
		}
	} catch (error) {
		console.log('[SW] Background sync failed:', error);
	}
}

/**
 * Sync pending employee updates
 */
async function syncEmployeeUpdates() {
	try {
		const pendingUpdates = await getPendingEmployeeUpdates();
		
		for (const update of pendingUpdates) {
			try {
				const response = await fetch(`/api/v2/employees/${update.employeeId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${update.token}`
					},
					body: JSON.stringify(update.data)
				});
				
				if (response.ok) {
					await removePendingEmployeeUpdate(update.id);
					console.log('[SW] Synced employee update:', update.id);
				}
			} catch (error) {
				console.log('[SW] Failed to sync employee update:', error);
			}
		}
	} catch (error) {
		console.log('[SW] Employee sync failed:', error);
	}
}

/**
 * Push notifications
 */
self.addEventListener('push', (event) => {
	console.log('[SW] Push notification received');
	
	if (event.data) {
		const data = event.data.json();
		
		const options = {
			body: data.body || 'New notification from MountainHR',
			icon: '/favicon.png',
			badge: '/badge.png',
			tag: data.tag || 'mountainhr-notification',
			data: data.data || {},
			actions: [
				{
					action: 'view',
					title: 'View',
					icon: '/icons/view.png'
				},
				{
					action: 'dismiss',
					title: 'Dismiss'
				}
			]
		};
		
		event.waitUntil(
			self.registration.showNotification(
				data.title || 'MountainHR',
				options
			)
		);
	}
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
	console.log('[SW] Notification clicked:', event.action);
	
	event.notification.close();
	
	if (event.action === 'view') {
		const url = event.notification.data.url || '/';
		event.waitUntil(
			clients.openWindow(url)
		);
	}
});

/**
 * IndexedDB helpers for offline storage
 */
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('mountainhr-offline', 1);
		
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		
		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			
			if (!db.objectStoreNames.contains('communications')) {
				db.createObjectStore('communications', { keyPath: 'id' });
			}
			
			if (!db.objectStoreNames.contains('employee-updates')) {
				db.createObjectStore('employee-updates', { keyPath: 'id' });
			}
		};
	});
}

async function getPendingCommunications() {
	const db = await openDB();
	const transaction = db.transaction(['communications'], 'readonly');
	const store = transaction.objectStore('communications');
	
	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function getPendingEmployeeUpdates() {
	const db = await openDB();
	const transaction = db.transaction(['employee-updates'], 'readonly');
	const store = transaction.objectStore('employee-updates');
	
	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function removePendingCommunication(id) {
	const db = await openDB();
	const transaction = db.transaction(['communications'], 'readwrite');
	const store = transaction.objectStore('communications');
	
	return new Promise((resolve, reject) => {
		const request = store.delete(id);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

async function removePendingEmployeeUpdate(id) {
	const db = await openDB();
	const transaction = db.transaction(['employee-updates'], 'readwrite');
	const store = transaction.objectStore('employee-updates');
	
	return new Promise((resolve, reject) => {
		const request = store.delete(id);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

console.log('[SW] Service worker script loaded');