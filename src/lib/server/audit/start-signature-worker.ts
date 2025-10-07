#!/usr/bin/env node
// Signature Worker Startup Script
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Run this as a background process: node start-signature-worker.js

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createSignatureWorker, type SignatureWorker } from './signature-worker.js';

/**
 * Main function to start the signature worker
 */
async function main(): Promise<void> {
	console.log('Starting Audit Log Signature Worker...');
	console.log('Environment:', process.env.NODE_ENV || 'development');

	// Load configuration from environment variables
	const config = {
		databaseUrl: process.env.DATABASE_URL,
		batchSize: parseInt(process.env.SIGNATURE_BATCH_SIZE || '100'),
		batchIntervalMs: parseInt(process.env.SIGNATURE_BATCH_INTERVAL_MS || '1000'),
		maxRetries: parseInt(process.env.SIGNATURE_MAX_RETRIES || '3'),
		privateKeyPEM: process.env.AUDIT_SIGNATURE_PRIVATE_KEY, // Optional: for key rotation
		publicKeyId: process.env.AUDIT_SIGNATURE_PUBLIC_KEY_ID // Optional: for key tracking
	};

	let worker: SignatureWorker | null = null;

	try {
		worker = await createSignatureWorker(config);

		// Log worker status
		const status = worker.getStatus();
		console.log('Worker started successfully');
		console.log('Configuration:', {
			batchSize: status.config.batchSize,
			batchIntervalMs: status.config.batchIntervalMs,
			publicKeyId: status.publicKeyId
		});

		// Handle graceful shutdown
		const shutdown = async (signal: string) => {
			console.log(`\nReceived ${signal}, shutting down gracefully...`);
			if (worker) {
				await worker.stop();
			}
			process.exit(0);
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));

		// Keep process alive
		process.on('uncaughtException', (error) => {
			console.error('Uncaught exception:', error);
		});

		process.on('unhandledRejection', (reason, promise) => {
			console.error('Unhandled rejection at:', promise, 'reason:', reason);
		});

		console.log('Signature worker is running. Press Ctrl+C to stop.');
	} catch (error) {
		console.error('Failed to start signature worker:', error);
		process.exit(1);
	}
}

// Run main function if this script is executed directly
// Always run when this module is loaded
main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});

export { main };
