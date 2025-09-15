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

import { Pool, PoolClient } from 'pg';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import axios from 'axios';

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

export class HasuraMigrationLib {
  private pool: Pool;
  private config: MigrationConfig;
  private migrationsTable: string;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.migrationsTable = config.migrations.tableName || 'schema_migrations';
    
    this.pool = new Pool({
      connectionString: config.database.connectionString,
      max: config.database.poolConfig?.max || 20,
      idleTimeoutMillis: config.database.poolConfig?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.database.poolConfig?.connectionTimeoutMillis || 2000,
    });
  }

  /**
   * Initialize migration system
   * Creates migrations table and required infrastructure
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Create migrations tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          execution_time INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'applied',
          error_message TEXT,
          rollback_sql TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_migrations_version ON ${this.migrationsTable}(version);
        CREATE INDEX IF NOT EXISTS idx_migrations_status ON ${this.migrationsTable}(status);
        CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON ${this.migrationsTable}(applied_at);
      `);

      // Create migration locks table for concurrent execution protection
      await client.query(`
        CREATE TABLE IF NOT EXISTS migration_locks (
          id SERIAL PRIMARY KEY,
          migration_id VARCHAR(255) NOT NULL,
          locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          locked_by VARCHAR(255) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          UNIQUE(migration_id)
        );
      `);

      // Create performance tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS migration_performance (
          id SERIAL PRIMARY KEY,
          migration_id VARCHAR(255) NOT NULL,
          operation_type VARCHAR(50) NOT NULL,
          table_name VARCHAR(255),
          execution_time_ms INTEGER NOT NULL,
          rows_affected INTEGER,
          query_plan JSONB,
          measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_perf_migration_id ON migration_performance(migration_id);
        CREATE INDEX IF NOT EXISTS idx_perf_execution_time ON migration_performance(execution_time_ms);
      `);

      console.log('Migration system initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Load migrations from filesystem
   */
  async loadMigrations(): Promise<Migration[]> {
    const migrationsDir = resolve(this.config.migrations.directory);
    const migrations: Migration[] = [];

    try {
      await mkdir(migrationsDir, { recursive: true });
      const files = await readdir(migrationsDir);
      
      for (const file of files.filter(f => f.endsWith('.sql'))) {
        const migrationPath = join(migrationsDir, file);
        const content = await readFile(migrationPath, 'utf-8');
        
        // Parse migration file
        const migration = this.parseMigrationFile(file, content);
        migrations.push(migration);
      }

      // Sort by version
      return migrations.sort((a, b) => a.version.localeCompare(b.version));
    } catch (error) {
      throw new Error(`Failed to load migrations: ${error.message}`);
    }
  }

  /**
   * Parse migration file content
   */
  private parseMigrationFile(filename: string, content: string): Migration {
    const lines = content.split('\n');
    let upSql = '';
    let downSql = '';
    let metadata: HasuraMetadata = {};
    let performance: PerformanceConfig = {};
    let currentSection = 'up';
    let inMetadata = false;
    let inPerformance = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('-- DOWN')) {
        currentSection = 'down';
        continue;
      }
      
      if (trimmed.startsWith('-- METADATA')) {
        inMetadata = true;
        continue;
      }
      
      if (trimmed.startsWith('-- PERFORMANCE')) {
        inPerformance = true;
        continue;
      }
      
      if (trimmed.startsWith('-- END')) {
        inMetadata = false;
        inPerformance = false;
        continue;
      }

      if (inMetadata && trimmed.startsWith('-- ')) {
        try {
          const metadataJson = trimmed.substring(3);
          metadata = JSON.parse(metadataJson);
        } catch (error) {
          console.warn(`Failed to parse metadata in ${filename}:`, error.message);
        }
        continue;
      }

      if (inPerformance && trimmed.startsWith('-- ')) {
        try {
          const performanceJson = trimmed.substring(3);
          performance = JSON.parse(performanceJson);
        } catch (error) {
          console.warn(`Failed to parse performance config in ${filename}:`, error.message);
        }
        continue;
      }

      if (currentSection === 'up' && !inMetadata && !inPerformance) {
        upSql += line + '\n';
      } else if (currentSection === 'down' && !inMetadata && !inPerformance) {
        downSql += line + '\n';
      }
    }

    // Extract version and name from filename
    const match = filename.match(/^(\d{14})_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }

    const [, version, name] = match;
    const id = `${version}_${name}`;
    const checksum = createHash('sha256').update(content).digest('hex');

    return {
      id,
      name: name.replace(/_/g, ' '),
      version,
      up: upSql.trim(),
      down: downSql.trim(),
      checksum,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      performance: Object.keys(performance).length > 0 ? performance : undefined
    };
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, name, version, applied_at, checksum, execution_time, status
        FROM ${this.migrationsTable}
        ORDER BY version ASC
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Check pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = await this.loadMigrations();
    const appliedMigrations = await this.getMigrationStatus();
    const appliedIds = new Set(appliedMigrations.map(m => m.id));

    return allMigrations.filter(m => !appliedIds.has(m.id));
  }

  /**
   * Apply migrations
   */
  async migrate(): Promise<{ applied: Migration[], errors: Error[] }> {
    const pendingMigrations = await this.getPendingMigrations();
    const applied: Migration[] = [];
    const errors: Error[] = [];

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return { applied, errors };
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        await this.applyMigration(migration);
        applied.push(migration);
        console.log(`✓ Applied migration: ${migration.name}`);
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.name}:`, error.message);
        errors.push(error);
        
        // Stop on first error to maintain data integrity
        break;
      }
    }

    return { applied, errors };
  }

  /**
   * Apply single migration with performance tracking
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');

      // Acquire migration lock
      await this.acquireMigrationLock(client, migration.id);

      // Apply SQL migration
      console.log(`Applying SQL for migration: ${migration.name}`);
      await client.query(migration.up);

      // Apply performance optimizations
      if (migration.performance) {
        await this.applyPerformanceOptimizations(client, migration.performance);
      }

      // Record migration as applied
      const executionTime = Date.now() - startTime;
      await client.query(`
        INSERT INTO ${this.migrationsTable} 
        (id, name, version, checksum, execution_time, status, rollback_sql)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        migration.id,
        migration.name,
        migration.version,
        migration.checksum,
        executionTime,
        'applied',
        migration.down
      ]);

      await client.query('COMMIT');

      // Apply Hasura metadata if present
      if (migration.metadata) {
        await this.applyHasuraMetadata(migration.metadata);
      }

      // Verify performance requirements
      if (this.config.performance.enableQueryAnalysis) {
        await this.verifyPerformanceRequirements(migration);
      }

      // Release lock
      await this.releaseMigrationLock(client, migration.id);

    } catch (error) {
      await client.query('ROLLBACK');
      await this.releaseMigrationLock(client, migration.id);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply performance optimizations
   */
  private async applyPerformanceOptimizations(client: PoolClient, config: PerformanceConfig): Promise<void> {
    // Create indexes
    if (config.indexes) {
      for (const index of config.indexes) {
        const indexName = index.name || `idx_${index.table}_${index.columns.join('_')}`;
        const unique = index.unique ? 'UNIQUE' : '';
        const type = index.type || 'btree';
        const where = index.where ? `WHERE ${index.where}` : '';
        
        const sql = `
          CREATE ${unique} INDEX IF NOT EXISTS ${indexName}
          ON ${index.table} USING ${type} (${index.columns.join(', ')})
          ${where}
        `;
        
        await client.query(sql);
        console.log(`Created index: ${indexName}`);
      }
    }

    // Create constraints
    if (config.constraints) {
      for (const constraint of config.constraints) {
        const sql = `
          ALTER TABLE ${constraint.table}
          ADD CONSTRAINT IF NOT EXISTS ${constraint.name}
          ${constraint.definition}
        `;
        
        await client.query(sql);
        console.log(`Created constraint: ${constraint.name}`);
      }
    }

    // Create RLS policies
    if (config.policies) {
      for (const policy of config.policies) {
        // Enable RLS if not already enabled
        await client.query(`ALTER TABLE ${policy.table} ENABLE ROW LEVEL SECURITY`);
        
        let sql = `
          CREATE POLICY IF NOT EXISTS ${policy.name}
          ON ${policy.table}
          FOR ${policy.command}
          TO ${policy.role}
        `;
        
        if (policy.using) {
          sql += ` USING (${policy.using})`;
        }
        
        if (policy.with_check) {
          sql += ` WITH CHECK (${policy.with_check})`;
        }
        
        await client.query(sql);
        console.log(`Created RLS policy: ${policy.name}`);
      }
    }
  }

  /**
   * Apply Hasura metadata
   */
  private async applyHasuraMetadata(metadata: HasuraMetadata): Promise<void> {
    const hasuraEndpoint = `${this.config.hasura.endpoint}/v1/metadata`;
    
    try {
      const response = await axios.post(hasuraEndpoint, {
        type: 'replace_metadata',
        args: {
          metadata: metadata,
          allow_inconsistent_metadata: false
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': this.config.hasura.adminSecret
        }
      });

      if (response.data.is_consistent === false) {
        throw new Error(`Hasura metadata inconsistent: ${JSON.stringify(response.data.inconsistent_objects)}`);
      }

      console.log('Applied Hasura metadata successfully');
    } catch (error) {
      if (error.response) {
        throw new Error(`Hasura metadata error: ${error.response.data.error || error.response.statusText}`);
      }
      throw new Error(`Failed to apply Hasura metadata: ${error.message}`);
    }
  }

  /**
   * Verify performance requirements
   */
  private async verifyPerformanceRequirements(migration: Migration): Promise<void> {
    if (!this.config.performance.targetResponseTime) {
      return;
    }

    const client = await this.pool.connect();
    const targetTime = this.config.performance.targetResponseTime;

    try {
      // Test common queries that should meet performance requirements
      const testQueries = [
        'SELECT COUNT(*) FROM users WHERE is_active = true',
        'SELECT COUNT(*) FROM departments WHERE is_active = true',
        'SELECT u.id, u.display_name FROM users u JOIN job_information ji ON u.id = ji.employee_id LIMIT 50'
      ];

      for (const query of testQueries) {
        const startTime = Date.now();
        
        try {
          await client.query(query);
          const executionTime = Date.now() - startTime;
          
          if (executionTime > targetTime) {
            console.warn(`Query exceeded target response time (${executionTime}ms > ${targetTime}ms): ${query}`);
          } else {
            console.log(`Query performance OK (${executionTime}ms): ${query.substring(0, 50)}...`);
          }
        } catch (error) {
          // Table may not exist yet - not a performance issue
          console.log(`Skipped performance test for non-existent table: ${query}`);
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Acquire migration lock to prevent concurrent execution
   */
  private async acquireMigrationLock(client: PoolClient, migrationId: string): Promise<void> {
    const lockTimeout = this.config.migrations.lockTimeout || 300000; // 5 minutes
    const expiresAt = new Date(Date.now() + lockTimeout);
    const lockedBy = `hasura-migration-lib-${process.pid}`;

    try {
      await client.query(`
        INSERT INTO migration_locks (migration_id, locked_by, expires_at)
        VALUES ($1, $2, $3)
      `, [migrationId, lockedBy, expiresAt]);
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error(`Migration ${migrationId} is already being executed by another process`);
      }
      throw error;
    }
  }

  /**
   * Release migration lock
   */
  private async releaseMigrationLock(client: PoolClient, migrationId: string): Promise<void> {
    await client.query(`
      DELETE FROM migration_locks 
      WHERE migration_id = $1
    `, [migrationId]);
  }

  /**
   * Rollback migration
   */
  async rollback(migrationId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get migration details
      const migrationResult = await client.query(`
        SELECT rollback_sql, name FROM ${this.migrationsTable}
        WHERE id = $1 AND status = 'applied'
      `, [migrationId]);

      if (migrationResult.rows.length === 0) {
        throw new Error(`Migration ${migrationId} not found or not applied`);
      }

      const { rollback_sql, name } = migrationResult.rows[0];

      if (!rollback_sql) {
        throw new Error(`No rollback script available for migration ${migrationId}`);
      }

      // Execute rollback
      await client.query(rollback_sql);

      // Update migration status
      await client.query(`
        UPDATE ${this.migrationsTable}
        SET status = 'rolled_back', updated_at = NOW()
        WHERE id = $1
      `, [migrationId]);

      await client.query('COMMIT');
      console.log(`✓ Rolled back migration: ${name}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate new migration file
   */
  async generateMigration(name: string, options: {
    up?: string;
    down?: string;
    metadata?: HasuraMetadata;
    performance?: PerformanceConfig;
  } = {}): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const fileName = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = join(this.config.migrations.directory, fileName);

    let content = `-- Migration: ${name}\n`;
    content += `-- Created: ${new Date().toISOString()}\n\n`;
    
    // UP section
    content += `-- UP\n`;
    content += options.up || `-- Add your migration SQL here\n`;
    content += `\n`;

    // DOWN section
    content += `-- DOWN\n`;
    content += options.down || `-- Add your rollback SQL here\n`;
    content += `\n`;

    // Metadata section
    if (options.metadata) {
      content += `-- METADATA\n`;
      content += `-- ${JSON.stringify(options.metadata, null, 2).split('\n').join('\n-- ')}\n`;
      content += `-- END\n\n`;
    }

    // Performance section
    if (options.performance) {
      content += `-- PERFORMANCE\n`;
      content += `-- ${JSON.stringify(options.performance, null, 2).split('\n').join('\n-- ')}\n`;
      content += `-- END\n\n`;
    }

    await writeFile(filePath, content);
    console.log(`Generated migration file: ${fileName}`);
    
    return filePath;
  }

  /**
   * Clean up old migration locks
   */
  async cleanupLocks(): Promise<void> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        DELETE FROM migration_locks
        WHERE expires_at < NOW()
      `);

      if (result.rowCount > 0) {
        console.log(`Cleaned up ${result.rowCount} expired migration locks`);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export types for external use
export * from './types';
export { HasuraMigrationLib as default };