/**
 * Hasura Migration Library
 *
 * Provides comprehensive database schema management, migration tracking,
 * and automated deployment capabilities for PostgreSQL + Hasura.
 *
 * Features:
 * - Automated schema migration with rollback support
 * - Hasura metadata synchronization
 * - Migration validation and verification
 * - Performance index optimization
 * - Zero-downtime deployment strategies
 */
export interface MigrationConfig {
    database: {
        connectionString: string;
        poolConfig?: {
            max?: number;
            idleTimeoutMillis?: number;
            connectionTimeoutMillis?: number;
        };
    };
    hasura: {
        endpoint: string;
        adminSecret: string;
    };
    migrations: {
        directory: string;
        tableName?: string;
        lockTimeout?: number;
    };
    performance: {
        enableIndexOptimization?: boolean;
        targetResponseTime?: number;
        enableQueryAnalysis?: boolean;
    };
}
export interface Migration {
    id: string;
    name: string;
    version: string;
    up: string;
    down: string;
    checksum: string;
    dependencies?: string[];
    metadata?: HasuraMetadata;
    performance?: PerformanceConfig;
}
export interface HasuraMetadata {
    tables?: any[];
    relationships?: any[];
    permissions?: any[];
    computed_fields?: any[];
    functions?: any[];
    remote_schemas?: any[];
    actions?: any[];
    triggers?: any[];
}
export interface PerformanceConfig {
    indexes?: IndexDefinition[];
    constraints?: ConstraintDefinition[];
    policies?: PolicyDefinition[];
}
export interface IndexDefinition {
    table: string;
    columns: string[];
    type?: 'btree' | 'hash' | 'gin' | 'gist';
    unique?: boolean;
    where?: string;
    name?: string;
}
export interface ConstraintDefinition {
    table: string;
    name: string;
    type: 'check' | 'unique' | 'foreign_key';
    definition: string;
}
export interface PolicyDefinition {
    table: string;
    name: string;
    command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
    role: string;
    using?: string;
    with_check?: string;
}
export interface MigrationStatus {
    id: string;
    name: string;
    version: string;
    applied_at: Date;
    checksum: string;
    execution_time: number;
    status: 'applied' | 'failed' | 'rolled_back';
}
export declare class HasuraMigrationLib {
    private pool;
    private config;
    private migrationsTable;
    constructor(config: MigrationConfig);
    /**
     * Initialize migration system
     * Creates migrations table and required infrastructure
     */
    initialize(): Promise<void>;
    /**
     * Load migrations from filesystem
     */
    loadMigrations(): Promise<Migration[]>;
    /**
     * Parse migration file content
     */
    private parseMigrationFile;
    /**
     * Get migration status
     */
    getMigrationStatus(): Promise<MigrationStatus[]>;
    /**
     * Check pending migrations
     */
    getPendingMigrations(): Promise<Migration[]>;
    /**
     * Apply migrations
     */
    migrate(): Promise<{
        applied: Migration[];
        errors: Error[];
    }>;
    /**
     * Apply single migration with performance tracking
     */
    private applyMigration;
    /**
     * Apply performance optimizations
     */
    private applyPerformanceOptimizations;
    /**
     * Apply Hasura metadata
     */
    private applyHasuraMetadata;
    /**
     * Verify performance requirements
     */
    private verifyPerformanceRequirements;
    /**
     * Acquire migration lock to prevent concurrent execution
     */
    private acquireMigrationLock;
    /**
     * Release migration lock
     */
    private releaseMigrationLock;
    /**
     * Rollback migration
     */
    rollback(migrationId: string): Promise<void>;
    /**
     * Generate new migration file
     */
    generateMigration(name: string, options?: {
        up?: string;
        down?: string;
        metadata?: HasuraMetadata;
        performance?: PerformanceConfig;
    }): Promise<string>;
    /**
     * Clean up old migration locks
     */
    cleanupLocks(): Promise<void>;
    /**
     * Close database connections
     */
    close(): Promise<void>;
}
export * from './types';
export { HasuraMigrationLib as default };
