import { env } from '$env/dynamic/public';

// Client-side configuration - only public values
export const clientConfig = {
	geldbUrl: env.PUBLIC_GELDB_GRAPHQL_URL || 'http://localhost:5657/db/main/ext/graphql', // Direct connection to GelDB
	apiUrl: env.PUBLIC_API_URL || 'http://localhost:5173/api',
	appName: env.PUBLIC_APP_NAME || 'MountainHR',
	version: env.PUBLIC_APP_VERSION || '1.0.0'
} as const;

// Type for client configuration
export type ClientConfig = typeof clientConfig;
