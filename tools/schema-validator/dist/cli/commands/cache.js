/**
 * Cache commands - Manage validation cache
 */
import chalk from 'chalk';
import { SchemaCache } from '../../cache/schema-cache.js';
import { loadConfig } from '../utils/config-loader.js';
async function clearCache(options) {
    try {
        const config = await loadConfig(options.config);
        const cache = new SchemaCache(config.cacheDir);
        if (options.all) {
            await cache.clearAll();
            console.log(chalk.green('✓ Cleared all cache'));
        }
        else {
            if (options.database) {
                await cache.clear('database');
                console.log(chalk.green('✓ Cleared database cache'));
            }
            if (options.api) {
                await cache.clear('api');
                console.log(chalk.green('✓ Cleared API cache'));
            }
            if (options.operations) {
                await cache.clear('operations');
                console.log(chalk.green('✓ Cleared operations cache'));
            }
            if (!options.database && !options.api && !options.operations) {
                console.log(chalk.yellow('⚠️  No cache type specified. Use --all, --database, --api, or --operations'));
            }
        }
    }
    catch (error) {
        console.error(chalk.red('❌ Cache clear failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function showCacheStats(options) {
    try {
        const config = await loadConfig(options.config);
        const cache = new SchemaCache(config.cacheDir);
        const stats = await cache.getStats();
        console.log(chalk.bold('\n📊 Cache Statistics:\n'));
        const formatAge = (age) => {
            if (age === null)
                return 'N/A';
            if (age < 60)
                return `${age.toFixed(0)}s`;
            if (age < 3600)
                return `${(age / 60).toFixed(1)}m`;
            return `${(age / 3600).toFixed(1)}h`;
        };
        console.log(`  ${chalk.cyan('Database:')} ${stats.database.valid ? chalk.green('✓') : chalk.red('✗')} (age: ${formatAge(stats.database.age)})`);
        console.log(`  ${chalk.cyan('API:')} ${stats.api.valid ? chalk.green('✓') : chalk.red('✗')} (age: ${formatAge(stats.api.age)})`);
        console.log(`  ${chalk.cyan('Operations:')} ${stats.operations.valid ? chalk.green('✓') : chalk.red('✗')} (age: ${formatAge(stats.operations.age)})`);
        console.log('');
    }
    catch (error) {
        console.error(chalk.red('❌ Failed to get cache stats:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
export const cacheCommand = {
    clear: clearCache,
    stats: showCacheStats,
};
//# sourceMappingURL=cache.js.map