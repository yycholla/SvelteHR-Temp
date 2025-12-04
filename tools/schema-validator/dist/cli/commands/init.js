/**
 * Init command - Initialize schema validator configuration
 */
import chalk from 'chalk';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { saveConfig } from '../utils/config-loader.js';
/**
 * Init command handler
 */
export async function initCommand(options) {
  console.log(chalk.bold('🚀 Initializing Schema Validator...\n'));
  try {
    // Create default configuration
    const config = {
      databaseUrl: process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/postgres',
      apiUrl: process.env['API_URL'] ?? 'http://localhost:8080/graphql',
      graphqlPaths: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.svelte'],
      cacheDir: options.cacheDir ?? '.schema-cache',
      cacheTtl: 3600,
      computedFields: [],
      strict: false,
      ignore: ['node_modules/**', 'dist/**', 'build/**'],
    };
    // Save configuration file
    const configPath = options.config ?? './schema-validator.config.json';
    if (existsSync(configPath)) {
      console.log(chalk.yellow(`⚠️  Configuration file already exists: ${configPath}`));
      console.log(chalk.gray('Skipping configuration creation.\n'));
    } else {
      await saveConfig(config, configPath);
      console.log(chalk.green(`✓ Created configuration file: ${configPath}`));
    }
    // Create cache directory
    if (!existsSync(config.cacheDir)) {
      await mkdir(config.cacheDir, { recursive: true });
      console.log(chalk.green(`✓ Created cache directory: ${config.cacheDir}`));
    } else {
      console.log(chalk.gray(`Cache directory already exists: ${config.cacheDir}`));
    }
    // Install pre-commit hooks
    if (options.installHooks) {
      await installPreCommitHook();
      console.log(chalk.green('✓ Installed pre-commit hook'));
    }
    console.log(chalk.bold.green('\n✅ Initialization complete!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray('  1. Update configuration in schema-validator.config.json'));
    console.log(chalk.gray('  2. Set DATABASE_URL environment variable'));
    console.log(chalk.gray('  3. Set API_URL environment variable'));
    console.log(chalk.gray('  4. Run: schema-validator validate\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Initialization failed:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
/**
 * Install pre-commit hook using Husky
 */
async function installPreCommitHook() {
  const { execSync } = await import('child_process');
  try {
    // Check if Husky is installed
    if (!existsSync('node_modules/husky')) {
      console.log(chalk.yellow('⚠️  Husky not found. Installing...'));
      execSync('npm install --save-dev husky', { stdio: 'inherit' });
    }
    // Initialize Husky
    execSync('npx husky init', { stdio: 'pipe' });
    // Create pre-commit hook
    const hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run schema validation on staged files
npx schema-validator validate --staged --json > /dev/null

if [ $? -ne 0 ]; then
  echo "❌ Schema validation failed. Commit blocked."
  echo "Run 'npx schema-validator validate --staged' to see details."
  echo "To bypass: git commit --no-verify"
  exit 1
fi
`;
    await writeFile('.husky/pre-commit', hookContent, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to install pre-commit hook: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
//# sourceMappingURL=init.js.map
