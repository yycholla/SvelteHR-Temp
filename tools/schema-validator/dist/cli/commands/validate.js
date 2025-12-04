/**
 * Validate command - Main schema alignment validation
 */
import chalk from 'chalk';
import { SchemaValidator } from '../../validators/schema-validator.js';
import { AlignmentReporter } from '../../reporters/alignment-reporter.js';
import { loadConfig } from '../utils/config-loader.js';
import { ReportFormat } from '../../types/enums.js';
/**
 * Validate command handler
 */
export async function validateCommand(options) {
  const startTime = Date.now();
  try {
    // Load configuration
    const config = await loadConfig(options.config);
    if (options.verbose) {
      console.log(chalk.gray('Configuration loaded from:'), options.config ?? 'default');
      console.log(chalk.gray('Database URL:'), maskUrl(config.databaseUrl));
      console.log(chalk.gray('API URL:'), config.apiUrl);
      console.log('');
    }
    // Create validator
    const validator = new SchemaValidator(config);
    // Show validation start
    if (!options.json) {
      console.log(chalk.bold('🔍 Starting schema validation...\n'));
    }
    // Run validation
    let result;
    if (options.staged) {
      // Get staged files from git
      const stagedFiles = await getStagedFiles();
      if (stagedFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No staged files to validate'));
        process.exit(0);
      }
      if (options.verbose) {
        console.log(chalk.gray(`Validating ${stagedFiles.length} staged file(s)...`));
      }
      result = await validator.validateFiles(stagedFiles);
    } else if (options.cache !== false && !options.full) {
      // Try to use cache
      const cached = await validator.checkCache();
      if (cached) {
        if (options.verbose) {
          console.log(chalk.green('✓ Using cached validation result'));
        }
        result = cached;
      } else {
        if (options.verbose) {
          console.log(chalk.gray('Cache miss, running full validation...'));
        }
        result = await validator.validate();
      }
    } else {
      // Full validation without cache
      if (options.verbose) {
        console.log(chalk.gray('Running full validation (cache disabled)...'));
      }
      result = await validator.validate();
    }
    // Generate report
    const reporter = new AlignmentReporter();
    if (options.json) {
      // JSON output
      const report = reporter.generate(result, ReportFormat.Json, {
        ...(options.filterField ? { filter: 'misaligned' } : {}),
      });
      console.log(report);
    } else {
      // Terminal output
      const report = reporter.generate(result, ReportFormat.Terminal, {
        ...(options.filterField ? { filter: 'misaligned' } : {}),
        includeSuggestions: true,
      });
      console.log(report);
    }
    // Show validation duration
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    if (!options.json) {
      console.log(chalk.gray(`\n⏱️  Validation completed in ${durationSec}s`));
    }
    // Exit with appropriate code
    if (result.passed) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Validation failed:'));
    console.error(error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}
/**
 * Get list of staged files from git
 */
async function getStagedFiles() {
  const { execSync } = await import('child_process');
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.svelte'));
  } catch {
    return [];
  }
}
/**
 * Mask sensitive parts of URL
 */
function maskUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch {
    return '***';
  }
}
//# sourceMappingURL=validate.js.map
