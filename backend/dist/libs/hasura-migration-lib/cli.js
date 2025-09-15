#!/usr/bin/env node
/**
 * Hasura Migration CLI
 *
 * Command-line interface for the Hasura Migration Library
 * Provides commands for managing database migrations and Hasura metadata
 */
import { Command } from 'commander';
import { HasuraMigrationLib } from './index';
import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
const program = new Command();
// Global configuration
let config;
let migrationLib;
async function loadConfig(configPath) {
    const defaultConfigPaths = [
        'hasura-migration.config.json',
        'hasura-migration.config.js',
        join(process.cwd(), 'hasura-migration.config.json'),
        join(process.cwd(), 'hasura-migration.config.js')
    ];
    const paths = configPath ? [configPath] : defaultConfigPaths;
    for (const path of paths) {
        try {
            if (path.endsWith('.json')) {
                const content = await readFile(path, 'utf-8');
                return JSON.parse(content);
            }
            else if (path.endsWith('.js')) {
                const configModule = await import(path);
                return configModule.default || configModule;
            }
        }
        catch (error) {
            continue;
        }
    }
    throw new Error('No configuration file found. Please create hasura-migration.config.json');
}
async function initializeMigrationLib() {
    if (!migrationLib) {
        migrationLib = new HasuraMigrationLib(config);
        await migrationLib.initialize();
    }
    return migrationLib;
}
// Helper functions
function logSuccess(message) {
    console.log(chalk.green('✓ ' + message));
}
function logError(message) {
    console.log(chalk.red('✗ ' + message));
}
function logWarning(message) {
    console.log(chalk.yellow('⚠ ' + message));
}
function logInfo(message) {
    console.log(chalk.blue('ℹ ' + message));
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}
// Command implementations
async function initCommand() {
    try {
        logInfo('Initializing migration system...');
        await initializeMigrationLib();
        logSuccess('Migration system initialized successfully');
    }
    catch (error) {
        logError(`Failed to initialize: ${error.message}`);
        process.exit(1);
    }
}
async function statusCommand() {
    try {
        const lib = await initializeMigrationLib();
        const status = await lib.getMigrationStatus();
        const pending = await lib.getPendingMigrations();
        console.log('\n' + chalk.bold('Migration Status:'));
        console.log('─'.repeat(80));
        if (status.length === 0) {
            logInfo('No migrations have been applied yet');
        }
        else {
            console.log(`Applied migrations: ${status.length}`);
            status.forEach(migration => {
                const statusColor = migration.status === 'applied' ? chalk.green :
                    migration.status === 'failed' ? chalk.red : chalk.yellow;
                console.log(`  ${statusColor('●')} ${migration.version} - ${migration.name} (${formatDuration(migration.execution_time)})`);
            });
        }
        console.log('');
        if (pending.length === 0) {
            logSuccess('All migrations are up to date');
        }
        else {
            logWarning(`${pending.length} pending migrations:`);
            pending.forEach(migration => {
                console.log(`  ${chalk.yellow('○')} ${migration.version} - ${migration.name}`);
            });
        }
        console.log('');
    }
    catch (error) {
        logError(`Failed to get status: ${error.message}`);
        process.exit(1);
    }
}
async function migrateCommand(options) {
    try {
        const lib = await initializeMigrationLib();
        if (options.dry) {
            logInfo('Performing dry run...');
            const pending = await lib.getPendingMigrations();
            if (pending.length === 0) {
                logSuccess('No pending migrations to apply');
                return;
            }
            console.log('\n' + chalk.bold('Would apply the following migrations:'));
            pending.forEach(migration => {
                console.log(`  → ${migration.version} - ${migration.name}`);
            });
            console.log('');
            return;
        }
        logInfo('Applying migrations...');
        const startTime = Date.now();
        const result = await lib.migrate();
        if (result.errors.length > 0) {
            logError(`Migration failed with ${result.errors.length} errors:`);
            result.errors.forEach(error => {
                console.log(`  ${chalk.red('✗')} ${error.message}`);
            });
        }
        if (result.applied.length > 0) {
            logSuccess(`Applied ${result.applied.length} migrations in ${formatDuration(Date.now() - startTime)}`);
            result.applied.forEach(migration => {
                console.log(`  ${chalk.green('✓')} ${migration.version} - ${migration.name}`);
            });
        }
        else {
            logInfo('No migrations to apply');
        }
    }
    catch (error) {
        logError(`Migration failed: ${error.message}`);
        process.exit(1);
    }
}
async function rollbackCommand(migrationId) {
    try {
        const lib = await initializeMigrationLib();
        if (!migrationId) {
            const status = await lib.getMigrationStatus();
            const appliedMigrations = status.filter(m => m.status === 'applied');
            if (appliedMigrations.length === 0) {
                logInfo('No applied migrations to rollback');
                return;
            }
            const { selectedMigration } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedMigration',
                    message: 'Select migration to rollback:',
                    choices: appliedMigrations.reverse().map(m => ({
                        name: `${m.version} - ${m.name}`,
                        value: m.id
                    }))
                }
            ]);
            migrationId = selectedMigration;
        }
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to rollback migration ${migrationId}?`,
                default: false
            }
        ]);
        if (!confirm) {
            logInfo('Rollback cancelled');
            return;
        }
        logInfo(`Rolling back migration: ${migrationId}`);
        await lib.rollback(migrationId);
        logSuccess('Migration rolled back successfully');
    }
    catch (error) {
        logError(`Rollback failed: ${error.message}`);
        process.exit(1);
    }
}
async function generateCommand(name, options) {
    try {
        const lib = await initializeMigrationLib();
        let upSql = options.up;
        let downSql = options.down;
        // Load from template if specified
        if (options.template) {
            try {
                const templateContent = await readFile(options.template, 'utf-8');
                const lines = templateContent.split('\n');
                let currentSection = 'up';
                let upContent = '';
                let downContent = '';
                for (const line of lines) {
                    if (line.trim().startsWith('-- DOWN')) {
                        currentSection = 'down';
                        continue;
                    }
                    if (currentSection === 'up') {
                        upContent += line + '\n';
                    }
                    else {
                        downContent += line + '\n';
                    }
                }
                upSql = upContent.trim();
                downSql = downContent.trim();
            }
            catch (error) {
                logWarning(`Could not load template: ${error.message}`);
            }
        }
        const filePath = await lib.generateMigration(name, {
            up: upSql,
            down: downSql
        });
        logSuccess(`Generated migration file: ${filePath}`);
    }
    catch (error) {
        logError(`Failed to generate migration: ${error.message}`);
        process.exit(1);
    }
}
async function cleanupCommand() {
    try {
        const lib = await initializeMigrationLib();
        await lib.cleanupLocks();
        logSuccess('Cleaned up expired migration locks');
    }
    catch (error) {
        logError(`Cleanup failed: ${error.message}`);
        process.exit(1);
    }
}
async function validateCommand() {
    try {
        const lib = await initializeMigrationLib();
        const migrations = await lib.loadMigrations();
        let hasErrors = false;
        console.log('\n' + chalk.bold('Migration Validation:'));
        console.log('─'.repeat(80));
        for (const migration of migrations) {
            try {
                // Basic syntax validation
                if (!migration.up.trim()) {
                    logWarning(`${migration.id}: Empty UP migration`);
                }
                if (!migration.down.trim()) {
                    logWarning(`${migration.id}: Empty DOWN migration`);
                }
                // Check for potential performance issues
                const upLower = migration.up.toLowerCase();
                if (upLower.includes('alter table') && upLower.includes('add column') && !upLower.includes('default')) {
                    logWarning(`${migration.id}: Adding column without default may cause performance issues`);
                }
                if (upLower.includes('create index') && !upLower.includes('concurrently')) {
                    logWarning(`${migration.id}: Consider using CREATE INDEX CONCURRENTLY for large tables`);
                }
                logSuccess(`${migration.id}: Validation passed`);
            }
            catch (error) {
                logError(`${migration.id}: ${error.message}`);
                hasErrors = true;
            }
        }
        if (hasErrors) {
            process.exit(1);
        }
        else {
            logSuccess('All migrations validated successfully');
        }
    }
    catch (error) {
        logError(`Validation failed: ${error.message}`);
        process.exit(1);
    }
}
// CLI setup
program
    .name('hasura-migrate')
    .description('Database migration tool for Hasura GraphQL')
    .version('1.0.0')
    .option('-c, --config <path>', 'Configuration file path');
program
    .command('init')
    .description('Initialize migration system')
    .action(initCommand);
program
    .command('status')
    .description('Show migration status')
    .action(statusCommand);
program
    .command('migrate')
    .description('Apply pending migrations')
    .option('--dry', 'Perform dry run without applying changes')
    .option('--target <version>', 'Migrate to specific version')
    .action(migrateCommand);
program
    .command('rollback [migration-id]')
    .description('Rollback a migration')
    .action(rollbackCommand);
program
    .command('generate <name>')
    .description('Generate new migration file')
    .option('--up <sql>', 'UP migration SQL')
    .option('--down <sql>', 'DOWN migration SQL')
    .option('--template <path>', 'Load from template file')
    .action(generateCommand);
program
    .command('cleanup')
    .description('Clean up expired migration locks')
    .action(cleanupCommand);
program
    .command('validate')
    .description('Validate all migration files')
    .action(validateCommand);
// Global error handler
program.configureHelp({
    sortSubcommands: true,
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Main execution
async function main() {
    try {
        const options = program.opts();
        config = await loadConfig(options.config);
        // Parse command line arguments
        await program.parseAsync(process.argv);
    }
    catch (error) {
        if (error.message.includes('No configuration file found')) {
            console.log('\n' + chalk.yellow('No configuration file found.'));
            console.log('Create a hasura-migration.config.json file with the following structure:\n');
            console.log(chalk.gray(JSON.stringify({
                database: {
                    connectionString: 'postgresql://user:password@localhost:5432/database'
                },
                hasura: {
                    endpoint: 'http://localhost:8080',
                    adminSecret: 'your-admin-secret'
                },
                migrations: {
                    directory: './migrations'
                },
                performance: {
                    targetResponseTime: 200,
                    enableQueryAnalysis: true
                }
            }, null, 2)));
            console.log('');
        }
        else {
            logError(error.message);
        }
        process.exit(1);
    }
    finally {
        if (migrationLib) {
            await migrationLib.close();
        }
    }
}
// Only run main if this file is executed directly
if (require.main === module) {
    main();
}
export { main, loadConfig };
//# sourceMappingURL=cli.js.map