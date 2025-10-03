// Async Signature Worker for Audit Logs (T029)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Implements LISTEN/NOTIFY pattern for batch signature generation
// FR-006: Cryptographic signatures for audit logs
// FR-013: Async signature generation to minimize performance impact
import { Pool } from 'pg';
import { signAuditLog, generateKeyPair, generatePublicKeyId } from './crypto-signer.js';
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    batchSize: 100, // Process 100 logs at a time
    batchIntervalMs: 1000, // Wait 1 second for batching
    maxRetries: 3
};
/**
 * Signature Worker Class
 * Listens to PostgreSQL NOTIFY events and generates signatures asynchronously
 */
export class SignatureWorker {
    constructor(config) {
        this.client = null;
        this.isRunning = false;
        this.pendingLogIds = new Set();
        this.batchTimer = null;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.pool = new Pool({ connectionString: this.config.databaseUrl });
        // Initialize keys
        if (this.config.privateKeyPEM) {
            // Use provided keys (for key rotation scenario)
            const crypto = require('crypto');
            this.privateKey = crypto.createPrivateKey(this.config.privateKeyPEM);
            // Derive public key from private key
            this.publicKey = crypto.createPublicKey(this.privateKey);
        }
        else {
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
    async start() {
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
            console.error('SignatureWorker database error:', err);
            this.handleConnectionError();
        });
        console.log(`SignatureWorker started (batch size: ${this.config.batchSize}, interval: ${this.config.batchIntervalMs}ms)`);
    }
    /**
     * Stop the signature worker gracefully
     */
    async stop() {
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
            console.log(`Processing ${this.pendingLogIds.size} remaining logs before shutdown...`);
            await this.processBatch();
        }
        // Unlisten and release client
        if (this.client) {
            try {
                await this.client.query('UNLISTEN audit_log_inserted');
                this.client.release();
            }
            catch (error) {
                console.error('Error during SignatureWorker shutdown:', error);
            }
            this.client = null;
        }
        // Close pool
        await this.pool.end();
        console.log('SignatureWorker stopped');
    }
    /**
     * Schedule batch processing with debouncing
     */
    scheduleBatchProcessing() {
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
    async processBatch() {
        if (this.pendingLogIds.size === 0) {
            return;
        }
        // Take up to batchSize logs from pending set
        const logIds = Array.from(this.pendingLogIds).slice(0, this.config.batchSize);
        const batchSize = logIds.length;
        // Clear these from pending set
        logIds.forEach((id) => this.pendingLogIds.delete(id));
        console.log(`Processing batch of ${batchSize} audit logs for signature generation...`);
        try {
            await this.signBatch(logIds);
            console.log(`Successfully signed ${batchSize} audit logs`);
        }
        catch (error) {
            console.error(`Error signing batch of ${batchSize} logs:`, error);
            // Re-add failed logs to pending set for retry
            logIds.forEach((id) => this.pendingLogIds.add(id));
        }
    }
    /**
     * Sign a batch of audit logs
     */
    async signBatch(logIds) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Fetch audit logs that don't have signatures yet
            const result = await client.query(`
        SELECT al.*
        FROM hr_public.activity_logs al
        LEFT JOIN public.audit_log_signatures als ON al.id = als.activity_log_id
        WHERE al.id = ANY($1::uuid[])
        AND als.id IS NULL
        ORDER BY al.created_at ASC
      `, [logIds]);
            if (result.rows.length === 0) {
                await client.query('COMMIT');
                return; // All logs already signed
            }
            // Generate signatures for all logs
            const signatures = [];
            for (const log of result.rows) {
                try {
                    const signature = signAuditLog(log, this.privateKey);
                    signatures.push({ logId: log.id, signature });
                }
                catch (error) {
                    console.error(`Failed to sign audit log ${log.id}:`, error);
                    // Continue with other logs
                }
            }
            // Batch insert signatures
            if (signatures.length > 0) {
                const values = signatures
                    .map((s, idx) => `($${idx * 4 + 1}::uuid, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4}, NOW())`)
                    .join(', ');
                const params = signatures.flatMap((s) => [
                    s.logId,
                    s.signature,
                    'ES256',
                    this.publicKeyId
                ]);
                await client.query(`
          INSERT INTO public.audit_log_signatures (activity_log_id, signature, signature_algorithm, public_key_id, signed_at)
          VALUES ${values}
          ON CONFLICT (activity_log_id) DO NOTHING
        `, params);
                // Update activity_logs with signature_id (optional optimization)
                await client.query(`
          UPDATE hr_public.activity_logs al
          SET signature_id = als.id
          FROM public.audit_log_signatures als
          WHERE al.id = als.activity_log_id
          AND al.id = ANY($1::uuid[])
          AND al.signature_id IS NULL
        `, [logIds]);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Handle connection errors and attempt reconnection
     */
    async handleConnectionError() {
        console.error('SignatureWorker connection lost, attempting to reconnect...');
        // Release old client
        if (this.client) {
            try {
                this.client.release();
            }
            catch (e) {
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
        }
        catch (error) {
            console.error('SignatureWorker reconnection failed:', error);
            // Will retry on next error
        }
    }
    /**
     * Get worker status
     */
    getStatus() {
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
export async function createSignatureWorker(config) {
    const databaseUrl = config.databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/sveltekit_hr';
    const worker = new SignatureWorker({
        databaseUrl,
        ...config
    });
    await worker.start();
    return worker;
}
// Export all utilities
export default {
    SignatureWorker,
    createSignatureWorker
};
