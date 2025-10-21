/**
 * Report command - Generate alignment reports
 */
import chalk from 'chalk';
import { writeFile } from 'fs/promises';
import { SchemaValidator } from '../../validators/schema-validator.js';
import { AlignmentReporter } from '../../reporters/alignment-reporter.js';
import { loadConfig } from '../utils/config-loader.js';
export async function reportCommand(options) {
    try {
        const config = await loadConfig(options.config);
        const validator = new SchemaValidator(config);
        // Get validation result (from cache or run new)
        let result = await validator.checkCache();
        if (!result) {
            console.log(chalk.yellow('⚠️  No cached result. Running validation...\n'));
            result = await validator.validate();
        }
        // Generate report
        const reporter = new AlignmentReporter();
        const format = (options.format ?? 'terminal');
        const report = reporter.generate(result, format, {
            filter: options.filter,
            includeSuggestions: true,
        });
        // Output to file or stdout
        if (options.output) {
            await writeFile(options.output, report, 'utf-8');
            console.log(chalk.green(`✓ Report saved to: ${options.output}`));
        }
        else {
            console.log(report);
        }
        process.exit(result.passed ? 0 : 1);
    }
    catch (error) {
        console.error(chalk.red('❌ Report generation failed:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
//# sourceMappingURL=report.js.map