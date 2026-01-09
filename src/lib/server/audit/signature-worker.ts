import { logger } from '$lib/utils/logger';
// Async Signature Worker for Audit Logs (T029)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Implements LISTEN/NOTIFY pattern for batch signature generation
// FR-006: Cryptographic signatures for audit logs
// FR-013: Async signature generation to minimize performance impact

import { Pool, type PoolClient } from 'pg';
import {
	exportPublicKey,
	generateKeyPair,
	generatePublicKeyId,
	signAuditLog
} from './crypto-signer.js';

/**
 * Configuration for signature worker
 */
export interface SignatureWorkerConfig {
	databaseUrl: string;
	batchSize: number;
	batchIntervalMs: number;
	maxRetries: number;
	privateKeyPEM?: string; // Optional: use existing key, otherwise generate
	publicKeyId?: string; // Optional: key identifier for rotation
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<SignatureWorkerConfig> = {
	batchSize: 100, // Process 100 logs at a time
	batchIntervalMs: 1000, // Wait 1 second for batching
	maxRetries: 3
};

/**
 * Audit log entry for signing (subset of activity_logs schema)
 */
export interface AuditLogForSigning {
	id: string;
	employee_id: string | null;
	action: string;
	resource_type: string;
	resource_id: string;
	before_snapshot: any;
	after_snapshot: any;
	ip_address: string | null;
	user_agent: string | null;
	batch_id: string | null;
	is_rollback: boolean;
	created_at: Date;
}

/**
 * Signature Worker Class
 * Listens to PostgreSQL NOTIFY events and generates signatures asynchronously
 */
export class SignatureWorker {
	private pool: Pool;
	private config: SignatureWorkerConfig;
	private client: PoolClient | null = null;
	private isRunning: boolean = false;
	private pendingLogIds: Set<string> = new Set();
	private batchTimer: NodeJS.Timeout | null = null;
	private privateKey: any;
	private publicKey: any;
	private publicKeyId: string;

	constructor(config: SignatureWorkerConfig) {
		this.config = { ...DEFAULT_CONFIG, ...config } as SignatureWorkerConfig;
		this.pool = new Pool({ connectionString: this.config.databaseUrl });

		// Initialize keys
		if (this.config.privateKeyPEM) {
			// Use provided keys (for key rotation scenario)
			const crypto = require('crypto');
			this.privateKey = crypto.createPrivateKey(this.config.privateKeyPEM);
			// Derive public key from private key
			this.publicKey = crypto.createPublicKey(this.privateKey);
		} else {
			// Generate new key pair
			const keyPair = generateKeyPair();
			this.privateKey = keyPair.privateKey;
			this.publicKey = keyPair.publicKey;
		}

		this.publicKeyId = this.config.publicKeyId || generatePublicKeyId(this.publicKey);
	}

	/**
	 * Start the signature worker
	 * Connects to PostgreSQL and starts listening for NOTIFY events
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			throw new Error('SignatureWorker is already running');
		}

		this.isRunning = true;
		this.client = await this.pool.connect();

		// Listen to audit_log_inserted channel
		await this.client.query('LISTEN audit_log_inserted');

		// Handle NOTIFY events
		this.client.on('notification', (msg) => {
			if (msg.channel === 'audit_log_inserted' && msg.payload) {
				const logId = msg.payload;
				this.pendingLogIds.add(logId);

				// Schedule batch processing
				this.scheduleBatchProcessing();
			}
		});

		// Handle connection errors
		this.client.on('error', (err) => {
			logger.error('Signature worker connection error', err as Error);
			this.handleConnectionError();
		});

		logger.info(
			`SignatureWorker started (batch size: ${this.config.batchSize}, interval: ${this.config.batchIntervalMs}ms)`
		);
	}

	/**
	 * Stop the signature worker gracefully
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;

		// Clear batch timer
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}

		// Process remaining pending logs
		if (this.pendingLogIds.size > 0) {
			logger.info(`Processing ${this.pendingLogIds.size} remaining logs before shutdown...`);
			await this.processBatch();
		}

		// Unlisten and release client
		if (this.client) {
			try {
				await this.client.query('UNLISTEN audit_log_inserted');
				this.client.release();
			} catch (error) {
				logger.error('Error releasing client during shutdown', error as Error);
			}
			this.client = null;
		}

		// Close pool
		await this.pool.end();

		logger.info('SignatureWorker stopped');
	}

	/**
	 * Schedule batch processing with debouncing
	 */
	private scheduleBatchProcessing(): void {
		// If batch is full, process immediately
		if (this.pendingLogIds.size >= this.config.batchSize) {
			if (this.batchTimer) {
				clearTimeout(this.batchTimer);
				this.batchTimer = null;
			}
			void this.processBatch();
			return;
		}

		// Otherwise, wait for more logs or timeout
		if (!this.batchTimer) {
			this.batchTimer = setTimeout(() => {
				this.batchTimer = null;
				void this.processBatch();
			}, this.config.batchIntervalMs);
		}
	}

	/**
	 * Process a batch of pending audit logs
	 */
	private async processBatch(): Promise<void> {
		if (this.pendingLogIds.size === 0) {
			return;
		}

		// Take up to batchSize logs from pending set
		const logIds = Array.from(this.pendingLogIds).slice(0, this.config.batchSize);
		const batchSize = logIds.length;

		// Clear these from pending set
		logIds.forEach((id) => this.pendingLogIds.delete(id));

		logger.info(`Processing batch of ${batchSize} audit logs for signature generation...`);

		try {
			await this.signBatch(logIds);
			logger.info(`Successfully signed ${batchSize} audit logs`);
		} catch (error) {
			logger.error('Error processing batch of audit logs', error as Error);
			// Re-add failed logs to pending set for retry
			logIds.forEach((id) => this.pendingLogIds.add(id));
		}
	}

	/**
	 * Sign a batch of audit logs
	 */
	private async signBatch(logIds: string[]): Promise<void> {
		const client = await this.pool.connect();

		try {
			await client.query('BEGIN');

			// Fetch audit logs that don't have signatures yet
			const result = await client.query<AuditLogForSigning>(
				`
        SELECT al.*
        FROM hr_public.activity_logs al
        LEFT JOIN public.audit_log_signatures als ON al.id = als.activity_log_id
        WHERE al.id = ANY($1::uuid[])
        AND als.id IS NULL
        ORDER BY al.created_at ASC
      `,
				[logIds]
			);

			if (result.rows.length === 0) {
				await client.query('COMMIT');
				return; // All logs already signed
			}

			// Generate signatures for all logs
			const signatures: Array<{ logId: string; signature: string }> = [];

			for (const log of result.rows) {
				try {
					const signature = signAuditLog(log, this.privateKey);
					signatures.push({ logId: log.id, signature });
				} catch (error) {
					logger.error('Error signing audit log entry', error as Error);
					// Continue with other logs
				}
			}

			// Batch insert signatures
			if (signatures.length > 0) {
				const values = signatures
					.map(
						(s, idx) =>
							`($${idx * 4 + 1}::uuid, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4}, NOW())`
					)
					.join(', ');

				const params = signatures.flatMap((s) => [s.logId, s.signature, 'ES256', this.publicKeyId]);

				await client.query(
					`
          INSERT INTO public.audit_log_signatures (activity_log_id, signature, signature_algorithm, public_key_id, signed_at)
          VALUES ${values}
          ON CONFLICT (activity_log_id) DO NOTHING
        `,
					params
				);

				// Update activity_logs with signature_id (optional optimization)
				await client.query(
					`
          UPDATE hr_public.activity_logs al
          SET signature_id = als.id
          FROM public.audit_log_signatures als
          WHERE al.id = als.activity_log_id
          AND al.id = ANY($1::uuid[])
          AND al.signature_id IS NULL
        `,
					[logIds]
				);
			}

			await client.query('COMMIT');
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * Handle connection errors and attempt reconnection
	 */
	private async handleConnectionError(): Promise<void> {
		logger.error('SignatureWorker connection lost, attempting to reconnect...');

		// Release old client
		if (this.client) {
			try {
				this.client.release();
			} catch (e) {
				// Ignore errors during cleanup
			}
			this.client = null;
		}

		// Wait before reconnecting
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Attempt to reconnect
		try {
			if (this.isRunning) {
				await this.start();
			}
		} catch (error) {
			logger.error('Error during signature worker reconnection', error as Error);
			// Will retry on next error
		}
	}

	/**
	 * Get worker status
	 */
	getStatus(): {
		isRunning: boolean;
		pendingLogCount: number;
		publicKeyId: string;
		config: SignatureWorkerConfig;
	} {
		return {
			isRunning: this.isRunning,
			pendingLogCount: this.pendingLogIds.size,
			publicKeyId: this.publicKeyId,
			config: this.config
		};
	}
}

/**
 * Create and start a signature worker
 * Helper function for easy initialization
 */
export async function createSignatureWorker(
	config: Partial<SignatureWorkerConfig>
): Promise<SignatureWorker> {
	const databaseUrl =
		config.databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/sveltekit_hr';

	const worker = new SignatureWorker({
		databaseUrl,
		...config
	} as SignatureWorkerConfig);

	await worker.start();

	return worker;
}

// Export all utilities
export default {
	SignatureWorker,
	createSignatureWorker
};
