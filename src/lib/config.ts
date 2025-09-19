import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const config = {
	// Database
	geldbUrl: env.GELDB_URL || 'http://localhost:5656/db/main/ext/graphql',
	redisUrl: env.REDIS_URL || 'redis://localhost:6379',

	// Authentication
	jwtSecret: env.JWT_SECRET!,
	jwtExpiresIn: env.JWT_EXPIRES_IN || '15m',
	jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d',

	// Application
	environment: env.NODE_ENV || 'development',
	port: parseInt(env.PORT || '5173'),
	logLevel: env.LOG_LEVEL || 'info',

	// Public config (available on client)
	public: {
		apiUrl: publicEnv.PUBLIC_API_URL || 'http://localhost:5173/api',
		appName: publicEnv.PUBLIC_APP_NAME || 'MountainHR',
		version: publicEnv.PUBLIC_APP_VERSION || '1.0.0'
	}
} as const;

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'] as const;
for (const envVar of requiredEnvVars) {
	if (!env[envVar]) {
		throw new Error(`Missing required environment variable: ${envVar}`);
	}
}

// Type for configuration
export type Config = typeof config;
