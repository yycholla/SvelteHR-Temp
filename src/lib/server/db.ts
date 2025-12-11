import { logger } from '$lib/utils/logger';
// PostgreSQL database connection utilities
// Server-side only - do not import from client code

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration from environment
const dbConfig = {
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '5433'),
	database: process.env.DB_NAME || 'hr_system',
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || 'postgres123',
	max: 20, // Maximum pool size
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
	// Set default search path to include hr_public schema
	options: '-c search_path=hr_public,public'
};

// Create connection pool
let pool: pkg.Pool | null = null;

function getPool(): pkg.Pool {
	if (!pool) {
		pool = new Pool(dbConfig);
		pool.on('error', (err) => {
			logger.error('Database pool error', err as Error);
		});
	}
	return pool;
}

// Query helper with automatic connection management
export async function query<T extends pkg.QueryResultRow = any>(
	text: string,
	params: any[] = []
): Promise<pkg.QueryResult<T>> {
	const start = Date.now();
	try {
		const result = await getPool().query<T>(text, params);
		const duration = Date.now() - start;

		// Log slow queries (>100ms)
		if (duration > 100) {
			logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}...`);
		}

		return result;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		logger.error('Query:', text);
		logger.error('Params:', params);
		throw error;
	}
}

// Transaction helper
export async function transaction<T>(callback: (client: pkg.PoolClient) => Promise<T>): Promise<T> {
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

// Get a single client from the pool (for advanced use cases)
export async function getClient(): Promise<pkg.PoolClient> {
	return await getPool().connect();
}

// Graceful shutdown
export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}
}

// Helper to set JWT claims for RLS policies
export async function setJWTClaims(
	client: pkg.PoolClient,
	userId: string,
	userRole: string
): Promise<void> {
	await client.query(`SET LOCAL jwt.claims.user_id = '${userId}'`);
	await client.query(`SET LOCAL jwt.claims.role = '${userRole}'`);
}
