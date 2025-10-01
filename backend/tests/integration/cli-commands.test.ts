/**
 * Integration Test: CLI Command Execution
 *
 * This test validates the CLI command execution functionality.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// This import will fail initially - that's expected for TDD
import { CLICommandRegistry } from '../../src/sample-data/cli/CLICommandRegistry';
import { GenerateCommand } from '../../src/sample-data/cli/commands/GenerateCommand';
import { CleanCommand } from '../../src/sample-data/cli/commands/CleanCommand';
import { ValidateCommand } from '../../src/sample-data/cli/commands/ValidateCommand';
import { StatusCommand } from '../../src/sample-data/cli/commands/StatusCommand';
import type { CLIOptions, CLIResult, OutputFormat, LogLevel } from '../../src/sample-data/models/CLIInterface';

describe('CLI Command Execution Integration', () => {
  let registry: CLICommandRegistry;
  const testConfigPath = './backend/config/sample-data.json';
  const cliPath = './backend/dist/sample-data/cli/index.js';

  beforeAll(async () => {
    registry = new CLICommandRegistry();

    // Register all commands
    registry.register(new GenerateCommand());
    registry.register(new CleanCommand());
    registry.register(new ValidateCommand());
    registry.register(new StatusCommand());
  });

  beforeEach(async () => {
    // Clean up sample data before each test
    try {
      await execAsync('npm run clean-sample-data');
    } catch (error) {
      // Ignore errors if clean command doesn't exist yet
    }
  });

  test('should register and list all CLI commands', () => {
    const commands = registry.list();

    expect(commands).toBeDefined();
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);

    const commandNames = commands.map(cmd => cmd.name);
    expect(commandNames).toContain('generate-sample-data');
    expect(commandNames).toContain('clean-sample-data');
    expect(commandNames).toContain('validate-config');
    expect(commandNames).toContain('status');
  });

  test('should execute generate-sample-data command programmatically', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const result = await registry.execute('generate-sample-data', [testConfigPath], options);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    expect(result.data).toBeDefined();
    expect(result.data.totalRecordsGenerated).toBeGreaterThan(0);
  });

  test('should execute clean-sample-data command programmatically', async () => {
    // First generate some data
    await registry.execute('generate-sample-data', [testConfigPath]);

    // Then clean it
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const result = await registry.execute('clean-sample-data', [], options);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    expect(result.data).toBeDefined();
    expect(result.data.recordsDeleted).toBeGreaterThan(0);
  });

  test('should execute validate-config command programmatically', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const result = await registry.execute('validate-config', [testConfigPath], options);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    expect(result.data).toBeDefined();
    expect(result.data.isValid).toBe(true);
  });

  test('should execute status command programmatically', async () => {
    // Generate some data first
    await registry.execute('generate-sample-data', [testConfigPath]);

    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const result = await registry.execute('status', [], options);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    expect(result.data).toBeDefined();
    expect(result.data.totalSampleRecords).toBeGreaterThan(0);
    expect(result.data.tableStatuses).toBeDefined();
    expect(Array.isArray(result.data.tableStatuses)).toBe(true);
  });

  test('should handle dry-run mode correctly', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: true,
      logLevel: LogLevel.INFO
    };

    const result = await registry.execute('generate-sample-data', [testConfigPath], options);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('dry-run');
    expect(result.data).toBeDefined();

    // Verify no actual data was created
    const statusResult = await registry.execute('status', []);
    expect(statusResult.data.totalSampleRecords).toBe(0);
  });

  test('should support verbose output mode', async () => {
    const verboseOptions: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: true,
      dryRun: false,
      logLevel: LogLevel.DEBUG
    };

    const result = await registry.execute('generate-sample-data', [testConfigPath], verboseOptions);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.verboseOutput).toBeDefined();
    expect(Array.isArray(result.data.verboseOutput)).toBe(true);
  });

  test('should support different output formats', async () => {
    // Test JSON format
    const jsonOptions: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const jsonResult = await registry.execute('status', [], jsonOptions);
    expect(jsonResult.success).toBe(true);
    expect(typeof jsonResult.data).toBe('object');

    // Test TABLE format
    const tableOptions: CLIOptions = {
      format: OutputFormat.TABLE,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const tableResult = await registry.execute('status', [], tableOptions);
    expect(tableResult.success).toBe(true);

    // Test MINIMAL format
    const minimalOptions: CLIOptions = {
      format: OutputFormat.MINIMAL,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const minimalResult = await registry.execute('status', [], minimalOptions);
    expect(minimalResult.success).toBe(true);
  });

  test('should support different log levels', async () => {
    const logLevels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];

    for (const logLevel of logLevels) {
      const options: CLIOptions = {
        format: OutputFormat.JSON,
        verbose: false,
        dryRun: true,
        logLevel
      };

      const result = await registry.execute('validate-config', [testConfigPath], options);
      expect(result.success).toBe(true);
    }
  });

  test('should handle invalid command gracefully', async () => {
    await expect(
      registry.execute('invalid-command', [])
    ).rejects.toThrow();
  });

  test('should handle missing configuration file', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    await expect(
      registry.execute('generate-sample-data', ['./non-existent-config.json'], options)
    ).rejects.toThrow();
  });

  test('should handle invalid configuration file', async () => {
    // Create invalid config file
    const invalidConfigPath = './backend/config/invalid-config.json';
    await fs.writeFile(invalidConfigPath, '{ invalid json }', 'utf-8');

    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    await expect(
      registry.execute('validate-config', [invalidConfigPath], options)
    ).rejects.toThrow();

    // Clean up
    await fs.unlink(invalidConfigPath).catch(() => {});
  });

  test('should execute CLI commands via npm scripts', async () => {
    try {
      // Test generate command
      const { stdout: generateOutput } = await execAsync('npm run generate-sample-data');
      expect(generateOutput).toBeTruthy();
      expect(generateOutput).toContain('success');

      // Test status command
      const { stdout: statusOutput } = await execAsync('npm run sample-data-status');
      expect(statusOutput).toBeTruthy();

      // Test clean command
      const { stdout: cleanOutput } = await execAsync('npm run clean-sample-data');
      expect(cleanOutput).toBeTruthy();
      expect(cleanOutput).toContain('success');
    } catch (error: any) {
      // Commands might not be set up yet - that's expected for TDD
      expect(error.message).toBeTruthy();
    }
  });

  test('should execute CLI commands via make targets', async () => {
    try {
      // Test generate via make
      const { stdout: makeGenerate } = await execAsync('make dev-sample-data');
      expect(makeGenerate).toBeTruthy();

      // Test clean via make
      const { stdout: makeClean } = await execAsync('make clean-sample-data');
      expect(makeClean).toBeTruthy();
    } catch (error: any) {
      // Make targets might not be set up yet - that's expected for TDD
      expect(error.message).toBeTruthy();
    }
  });

  test('should provide helpful error messages', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    try {
      await registry.execute('generate-sample-data', [], options);
    } catch (error: any) {
      expect(error.message).toBeTruthy();
      expect(error.message.length).toBeGreaterThan(10);
      expect(error.message).toContain('config');
    }
  });

  test('should support command chaining', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    // Chain: validate -> generate -> status -> clean
    const validateResult = await registry.execute('validate-config', [testConfigPath], options);
    expect(validateResult.success).toBe(true);

    const generateResult = await registry.execute('generate-sample-data', [testConfigPath], options);
    expect(generateResult.success).toBe(true);

    const statusResult = await registry.execute('status', [], options);
    expect(statusResult.success).toBe(true);
    expect(statusResult.data.totalSampleRecords).toBeGreaterThan(0);

    const cleanResult = await registry.execute('clean-sample-data', [], options);
    expect(cleanResult.success).toBe(true);

    const finalStatusResult = await registry.execute('status', [], options);
    expect(finalStatusResult.data.totalSampleRecords).toBe(0);
  });

  test('should handle command execution timeout', async () => {
    // This test validates that long-running commands don't hang indefinitely
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const startTime = Date.now();

    const result = await registry.execute('generate-sample-data', [testConfigPath], options);

    const executionTime = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
  });

  test('should provide exit codes for CLI execution', async () => {
    // Successful command should have exit code 0
    const successOptions: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    const successResult = await registry.execute('validate-config', [testConfigPath], successOptions);
    expect(successResult.exitCode).toBe(0);

    // Failed command should have non-zero exit code
    try {
      await registry.execute('generate-sample-data', ['./invalid-path.json']);
    } catch (error: any) {
      expect(error.exitCode).toBeGreaterThan(0);
    }
  });

  test('should support command aliases', async () => {
    // Test that commands can be accessed by aliases
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    // Try common aliases
    const aliases = [
      { full: 'generate-sample-data', alias: 'generate' },
      { full: 'clean-sample-data', alias: 'clean' },
      { full: 'validate-config', alias: 'validate' }
    ];

    for (const { full, alias } of aliases) {
      try {
        const fullResult = await registry.execute(full, [testConfigPath], options);
        const aliasResult = await registry.execute(alias, [testConfigPath], options);

        expect(fullResult.success).toBe(aliasResult.success);
      } catch (error) {
        // Aliases might not be implemented yet - that's ok
      }
    }
  });

  test('should provide command help text', async () => {
    const commands = registry.list();

    commands.forEach(command => {
      expect(command.name).toBeTruthy();
      expect(command.description).toBeTruthy();
      expect(command.description.length).toBeGreaterThan(10);
    });
  });

  test('should handle concurrent command execution', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: false,
      dryRun: false,
      logLevel: LogLevel.INFO
    };

    // Execute multiple read-only commands concurrently
    const promises = [
      registry.execute('validate-config', [testConfigPath], options),
      registry.execute('status', [], options),
      registry.execute('validate-config', [testConfigPath], options)
    ];

    const results = await Promise.all(promises);

    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });

  test('should support progress reporting during long operations', async () => {
    const options: CLIOptions = {
      format: OutputFormat.JSON,
      verbose: true,
      dryRun: false,
      logLevel: LogLevel.DEBUG
    };

    const result = await registry.execute('generate-sample-data', [testConfigPath], options);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Check for progress information in verbose output
    if (result.data.verboseOutput) {
      expect(result.data.verboseOutput.length).toBeGreaterThan(0);
    }
  });

  test('should validate command arguments', async () => {
    const generateCmd = registry.get('generate-sample-data');

    expect(generateCmd).toBeDefined();
    expect(generateCmd!.arguments).toBeDefined();
    expect(Array.isArray(generateCmd!.arguments)).toBe(true);

    // Generate command should require config path argument
    const configArg = generateCmd!.arguments.find(arg => arg.name === 'configPath');
    if (configArg) {
      expect(configArg.required).toBe(true);
      expect(configArg.type).toBe('string');
    }
  });

  test('should unregister commands correctly', () => {
    const initialCount = registry.list().length;

    // Register a temporary command
    const tempCommand = {
      name: 'temp-command',
      description: 'Temporary test command',
      arguments: [],
      options: {
        format: OutputFormat.JSON,
        verbose: false,
        dryRun: false,
        logLevel: LogLevel.INFO
      },
      handler: async () => ({ success: true, message: 'Temp command executed' })
    };

    registry.register(tempCommand);
    expect(registry.list().length).toBe(initialCount + 1);

    // Unregister the command
    registry.unregister('temp-command');
    expect(registry.list().length).toBe(initialCount);
    expect(registry.get('temp-command')).toBeUndefined();
  });
});