/**
 * Check command - Quick status check using cache
 */
import chalk from 'chalk';
import { SchemaValidator } from '../../validators/schema-validator.js';
import { ReportFormat } from '../../types/enums.js';
import { AlignmentReporter } from '../../reporters/alignment-reporter.js';
import { loadConfig } from '../utils/config-loader.js';
export async function checkCommand(options) {
    try {
        const config = await loadConfig(options.config);
        const validator = new SchemaValidator(config);
        console.log(chalk.bold('🔍 Checking cache status...\n'));
        const cached = await validator.checkCache();
        if (!cached) {
            console.log(chalk.yellow('⚠️  No cached validation result found'));
            console.log(chalk.gray('Run: schema-validator validate\n'));
            process.exit(1);
        }
        const reporter = new AlignmentReporter();
        const report = reporter.generate(cached, ReportFormat.Terminal, {
            ...(options.field ? { filter: 'misaligned' } : {}),
            includeSuggestions: false,
        });
        console.log(report);
        process.exit(cached.passed ? 0 : 1);
    }
    catch (error) {
        console.error(chalk.red('❌ Check failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
//# sourceMappingURL=check.js.map