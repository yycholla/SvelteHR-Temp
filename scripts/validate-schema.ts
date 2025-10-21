#!/usr/bin/env tsx

/**
 * Schema Validation Script
 *
 * Validates schema alignment between GraphQL operations, PostgreSQL database, and Rust API.
 *
 * Usage:
 *   npm run schema:validate
 *   tsx scripts/validate-schema.ts
 *   tsx scripts/validate-schema.ts --full
 *   tsx scripts/validate-schema.ts --report
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

// Import types (would need to build schema-validator first)
interface ValidationResult {
  passed: boolean;
  timestamp: Date;
  durationMs: number;
  alignments: any[];
  summary: {
    totalFields: number;
    alignedCount: number;
    misalignedCount: number;
    byStatus: {
      aligned: number;
      missing_db: number;
      missing_api: number;
      type_mismatch: number;
      nullability_mismatch: number;
    };
  };
  errors: any[];
  warnings: any[];
}

async function loadConfig() {
  const configPath = join(process.cwd(), 'schema-validator.config.json');
  const configContent = await readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  // Replace environment variables
  const envVars = process.env;
  const interpolate = (str: string): string => {
    return str.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return envVars[varName] || '';
    });
  };

  if (config.database?.connectionString) {
    config.database.connectionString = interpolate(config.database.connectionString);
  }

  if (config.api?.endpoint) {
    config.api.endpoint = interpolate(config.api.endpoint);
  }

  return config;
}

async function validateSchema(): Promise<void> {
  console.log(chalk.blue.bold('\n🔍 Schema Validator\n'));
  console.log(chalk.gray('Validating GraphQL → Database → API alignment...\n'));

  try {
    // Load configuration
    const config = await loadConfig();
    console.log(chalk.green('✓ Configuration loaded'));
    console.log(chalk.gray(`  Database: ${config.database.connectionString.split('@')[1]}`));
    console.log(chalk.gray(`  API: ${config.api.endpoint}`));
    console.log(chalk.gray(`  Sources: ${config.sources.directory}\n`));

    // Import SchemaValidator dynamically
    const { SchemaValidator } = await import('../tools/schema-validator/dist/validators/schema-validator.js');

    // Create validator instance
    const validator = new SchemaValidator({
      databaseUrl: config.database.connectionString,
      apiUrl: config.api.endpoint,
      graphqlPaths: [config.sources.directory],
      strict: config.validation.strict,
      typeMappings: config.typeMappings,
      computedFields: config.validation.computedFields,
      cache: config.cache,
    });

    console.log(chalk.blue('Running validation...\n'));

    // Run validation
    const startTime = Date.now();
    const result: ValidationResult = await validator.validate();
    const duration = Date.now() - startTime;

    // Display results
    console.log(chalk.bold('\n📊 Validation Results\n'));
    console.log(chalk.gray('─'.repeat(50)));

    if (result.passed) {
      console.log(chalk.green.bold('\n✅ All schema alignments validated successfully!\n'));
    } else {
      console.log(chalk.red.bold('\n❌ Schema misalignments detected\n'));
    }

    // Summary statistics
    console.log(chalk.bold('Summary:'));
    console.log(`  Total fields: ${result.summary.totalFields}`);
    console.log(`  ${chalk.green('Aligned:')} ${result.summary.alignedCount}`);
    console.log(`  ${chalk.red('Misaligned:')} ${result.summary.misalignedCount}`);

    if (result.summary.misalignedCount > 0) {
      console.log(chalk.bold('\nBreakdown by status:'));
      if (result.summary.byStatus.missing_db > 0) {
        console.log(`  ${chalk.yellow('Missing in DB:')} ${result.summary.byStatus.missing_db}`);
      }
      if (result.summary.byStatus.missing_api > 0) {
        console.log(`  ${chalk.yellow('Missing in API:')} ${result.summary.byStatus.missing_api}`);
      }
      if (result.summary.byStatus.type_mismatch > 0) {
        console.log(`  ${chalk.yellow('Type mismatch:')} ${result.summary.byStatus.type_mismatch}`);
      }
      if (result.summary.byStatus.nullability_mismatch > 0) {
        console.log(`  ${chalk.yellow('Nullability mismatch:')} ${result.summary.byStatus.nullability_mismatch}`);
      }
    }

    console.log(`\n  Duration: ${duration}ms`);

    // Display errors
    if (result.errors.length > 0) {
      console.log(chalk.red.bold('\n\n🚨 Errors:\n'));
      console.log(chalk.gray('─'.repeat(50)));

      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(chalk.red(`\n${index + 1}. ${error.fieldPath}`));
        console.log(chalk.gray(`   ${error.message}`));

        if (error.location) {
          console.log(chalk.gray(`   Location: ${error.location.file}:${error.location.line}`));
        }

        if (error.suggestion) {
          console.log(chalk.cyan(`   💡 Suggestion: ${error.suggestion}`));
        }
      });

      if (result.errors.length > 10) {
        console.log(chalk.gray(`\n... and ${result.errors.length - 10} more errors`));
      }
    }

    // Display warnings
    if (result.warnings.length > 0) {
      console.log(chalk.yellow.bold('\n\n⚠️  Warnings:\n'));
      console.log(chalk.gray('─'.repeat(50)));

      result.warnings.slice(0, 5).forEach((warning, index) => {
        console.log(chalk.yellow(`\n${index + 1}. ${warning.message}`));
        if (warning.fieldPath) {
          console.log(chalk.gray(`   Field: ${warning.fieldPath}`));
        }
      });

      if (result.warnings.length > 5) {
        console.log(chalk.gray(`\n... and ${result.warnings.length - 5} more warnings`));
      }
    }

    // Next steps
    console.log(chalk.bold('\n\n📝 Next Steps:\n'));

    if (result.passed) {
      console.log(chalk.green('  • Schema is aligned and ready for production'));
      console.log(chalk.gray('  • Run `npm run schema:report` to generate a detailed report'));
      console.log(chalk.gray('  • Run `npm run schema:init` to set up pre-commit hooks'));
    } else {
      console.log(chalk.yellow('  • Review the errors above and fix misalignments'));
      console.log(chalk.gray('  • Run `npm run schema:report` for a detailed report'));
      console.log(chalk.gray('  • Use suggestions provided to fix issues quickly'));
      console.log(chalk.gray('  • Re-run validation after fixes'));
    }

    console.log(chalk.gray('\n' + '─'.repeat(50) + '\n'));

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Validation failed:\n'));

    if (error instanceof Error) {
      console.error(chalk.red(error.message));

      if (error.message.includes('ECONNREFUSED')) {
        console.error(chalk.yellow('\n💡 Tip: Make sure PostgreSQL and the GraphQL server are running:'));
        console.error(chalk.gray('  • Database: docker compose up postgres-dev'));
        console.error(chalk.gray('  • GraphQL API: cd graphql-rust-server && cargo run'));
      } else if (error.message.includes('introspection')) {
        console.error(chalk.yellow('\n💡 Tip: Ensure GraphQL introspection is enabled on the API'));
      }

      if (process.env.DEBUG) {
        console.error(chalk.gray('\n' + error.stack));
      }
    } else {
      console.error(chalk.red(String(error)));
    }

    console.error(chalk.gray('\nFor more help, see: tools/schema-validator/TROUBLESHOOTING.md\n'));

    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const fullValidation = args.includes('--full');
const generateReport = args.includes('--report');

if (generateReport) {
  console.log(chalk.blue('Generating validation report...'));
  console.log(chalk.gray('Run: npm run schema:report\n'));
  process.exit(0);
}

// Run validation
validateSchema().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
