// Constants for server hooks

// Define public routes that don't require authentication (using Set for O(1) lookups)
export const PUBLIC_ROUTES = new Set([
	'/',
	'/login',
	'/login-simple',
	'/login-working',
	'/privacy',
	'/terms',
	'/health',
	'/metrics', // Prometheus metrics endpoint (unauthenticated for cluster scraping)
	'/api/auth/login',
	'/api/auth/refresh',
	'/api/auth/logout',
	'/api/graphql', // GraphQL endpoint must allow unauthenticated login/refresh mutations
	'/api/health',
	'/api/metrics',
	'/api/auth/verify',
	'/api/intuit/disconnect' // Intuit webhook for app disconnection
]);

// Static file extensions to skip authentication for
export const STATIC_EXTENSIONS = new Set([
	'.js',
	'.css',
	'.woff',
	'.woff2',
	'.ttf',
	'.eot',
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.svg',
	'.webp',
	'.ico',
	'.json',
	'.map'
]);

export const SESSION_CACHE_TTL = 60 * 1000; // 60 seconds for most routes
export const DASHBOARD_CACHE_TTL = 5 * 1000; // 5 seconds for dashboard routes
