#!/usr/bin/env tsx

/**
 * Database Migration Management Tool for HR User Journeys
 *
 * Usage:
 *   npm run db:migrate:hr        - Run all HR-specific migrations
 *   npm run db:migrate:rollback  - Rollback last HR migration
 *   npm run db:migrate:status    - Check migration status
 *   npm run db:migrate:create    - Create new migration file
 */

import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IMigration {
  id: string;
  filename: string;
  applied_at: Date | null;
  checksum: string;
}

class HRMigrationManager {
  private client: Client;
  private migrationsDir: string;

  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/hr_system',
    });
    this.migrationsDir = path.join(__dirname, 'hr-user-journeys');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.ensureMigrationsTable();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS hr_private.migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        execution_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON hr_private.migrations(applied_at);
    `);
  }

  private async getAppliedMigrations(): Promise<IMigration[]> {
    const result = await this.client.query(
      'SELECT id, filename, applied_at, checksum FROM hr_private.migrations ORDER BY applied_at ASC'
    );
    return result.rows;
  }

  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      console.log('Migrations directory does not exist yet, creating...');
      await fs.mkdir(this.migrationsDir, { recursive: true });
      return [];
    }
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async readMigrationFile(filename: string): Promise<string> {
    const filePath = path.join(this.migrationsDir, filename);
    return await fs.readFile(filePath, 'utf-8');
  }

  async getStatus(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    console.log('\\n📋 HR Migration Status');
    console.log('======================');

    if (migrationFiles.length === 0) {
      console.log('No migration files found in hr-user-journeys/');
      return;
    }

    const appliedMap = new Map(appliedMigrations.map(m => [m.filename, m]));

    for (const file of migrationFiles) {
      const migration = appliedMap.get(file);
      if (migration) {
        console.log(`✅ ${file} - Applied at ${migration.applied_at}`);
      } else {
        console.log(`⏳ ${file} - Pending`);
      }
    }

    const pendingCount = migrationFiles.length - appliedMigrations.length;
    console.log(`\\n📊 Summary: ${appliedMigrations.length} applied, ${pendingCount} pending`);
  }

  async migrate(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    const appliedSet = new Set(appliedMigrations.map(m => m.filename));
    const pendingMigrations = migrationFiles.filter(file => !appliedSet.has(file));

    if (pendingMigrations.length === 0) {
      console.log('✅ All HR migrations are up to date!');
      return;
    }

    console.log(`\\n🚀 Running ${pendingMigrations.length} HR migrations...`);

    for (const filename of pendingMigrations) {
      const startTime = Date.now();
      console.log(`⏳ Applying ${filename}...`);

      try {
        await this.client.query('BEGIN');

        const content = await this.readMigrationFile(filename);
        const checksum = this.generateChecksum(content);

        // Execute the migration
        await this.client.query(content);

        // Record the migration
        const executionTime = Date.now() - startTime;
        await this.client.query(
          'INSERT INTO hr_private.migrations (id, filename, checksum, execution_time_ms) VALUES ($1, $2, $3, $4)',
          [filename.replace('.sql', ''), filename, checksum, executionTime]
        );

        await this.client.query('COMMIT');
        console.log(`✅ Applied ${filename} (${executionTime}ms)`);

      } catch (error) {
        await this.client.query('ROLLBACK');
        console.error(`❌ Failed to apply ${filename}:`, error);
        throw error;
      }
    }

    console.log('\\n🎉 All HR migrations completed successfully!');
  }

  async rollback(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    console.log(`\\n⏪ Rolling back ${lastMigration.filename}...`);

    try {
      await this.client.query('BEGIN');

      // Check if rollback script exists
      const rollbackFile = lastMigration.filename.replace('.sql', '.rollback.sql');
      const rollbackPath = path.join(this.migrationsDir, rollbackFile);

      try {
        const rollbackContent = await fs.readFile(rollbackPath, 'utf-8');
        await this.client.query(rollbackContent);
        console.log(`✅ Executed rollback script: ${rollbackFile}`);
      } catch {
        console.log('⚠️  No rollback script found, removing from migrations table only');
      }

      // Remove from migrations table
      await this.client.query(
        'DELETE FROM hr_private.migrations WHERE id = $1',
        [lastMigration.id]
      );

      await this.client.query('COMMIT');
      console.log(`✅ Rolled back ${lastMigration.filename}`);

    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error(`❌ Failed to rollback ${lastMigration.filename}:`, error);
      throw error;
    }
  }

  async createMigration(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[-T:.]/g, '').slice(0, 14);
    const filename = `${timestamp}_${name.toLowerCase().replace(/\\s+/g, '_')}.sql`;
    const rollbackFilename = `${timestamp}_${name.toLowerCase().replace(/\\s+/g, '_')}.rollback.sql`;

    const migrationPath = path.join(this.migrationsDir, filename);
    const rollbackPath = path.join(this.migrationsDir, rollbackFilename);

    const migrationTemplate = `-- HR User Journeys Migration: ${name}
-- Created: ${new Date().toISOString()}
--
-- This migration is part of the comprehensive HR user journeys system implementation.
-- Ensure all changes follow the existing schema patterns and security model.

BEGIN;

-- Add your migration SQL here
-- Example:
-- ALTER TABLE hr_public.users ADD COLUMN new_field TEXT;

COMMIT;
`;

    const rollbackTemplate = `-- Rollback for HR User Journeys Migration: ${name}
-- Created: ${new Date().toISOString()}

BEGIN;

-- Add rollback SQL here (reverse of migration)
-- Example:
-- ALTER TABLE hr_public.users DROP COLUMN IF EXISTS new_field;

COMMIT;
`;

    await fs.mkdir(this.migrationsDir, { recursive: true });
    await fs.writeFile(migrationPath, migrationTemplate);
    await fs.writeFile(rollbackPath, rollbackTemplate);

    console.log(`✅ Created migration files:`);
    console.log(`   📄 ${filename}`);
    console.log(`   📄 ${rollbackFilename}`);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  const manager = new HRMigrationManager();

  try {
    await manager.connect();

    switch (command) {
      case 'status':
        await manager.getStatus();
        break;
      case 'migrate':
        await manager.migrate();
        break;
      case 'rollback':
        await manager.rollback();
        break;
      case 'create':
        if (!arg) {
          console.error('Please provide a migration name: npm run db:migrate:create "migration name"');
          process.exit(1);
        }
        await manager.createMigration(arg);
        break;
      default:
        console.log('HR Migration Management Tool');
        console.log('');
        console.log('Available commands:');
        console.log('  status    - Show migration status');
        console.log('  migrate   - Run pending migrations');
        console.log('  rollback  - Rollback last migration');
        console.log('  create    - Create new migration file');
        console.log('');
        console.log('Examples:');
        console.log('  npm run db:migrate:hr status');
        console.log('  npm run db:migrate:hr migrate');
        console.log('  npm run db:migrate:hr create "add time tracking table"');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

// Fix the getMigrationFiles reference
const getMigrationFiles = HRMigrationManager.prototype.getMigrationFiles;

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}