/**
 * CLI Interface Contract: Sample Data Generation System
 *
 * Defines the command-line interface contracts for the sample data generation system.
 * All CLI commands must implement these interfaces for consistent behavior.
 */

import type {
  SampleDataConfig,
  SampleDataResult,
  DatabaseSchema,
  GenerationError
} from './sample-data-api';

/**
 * Base CLI command interface
 */
export interface CLICommand {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command aliases */
  aliases?: string[];
  /** Execute the command */
  execute(args: string[], options: Record<string, any>): Promise<CLIResult>;
  /** Get command help text */
  getHelp(): string;
}

/**
 * CLI command execution result
 */
export interface CLIResult {
  /** Exit code (0 = success, non-zero = error) */
  exitCode: number;
  /** Output message */
  message: string;
  /** Additional data for programmatic access */
  data?: any;
  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Progress reporting interface for CLI operations
 */
export interface CLIProgressReporter {
  /** Start progress reporting */
  start(total: number, description: string): void;
  /** Update progress */
  update(current: number, description?: string): void;
  /** Complete progress reporting */
  complete(message?: string): void;
  /** Report error */
  error(message: string): void;
}

// Generate Command Contracts

/**
 * generate-sample-data command
 * Usage: npm run generate-sample-data [options]
 */
export interface GenerateCommand extends CLICommand {
  name: 'generate-sample-data';
  execute(args: string[], options: GenerateCommandOptions): Promise<GenerateCommandResult>;
}

export interface GenerateCommandOptions {
  /** Configuration file path */
  config?: string;
  /** Specific tables to generate (comma-separated) */
  tables?: string;
  /** Force regeneration even if data exists */
  force?: boolean;
  /** Batch size for database operations */
  batchSize?: number;
  /** Seed value for deterministic generation */
  seed?: number;
  /** Disable progress reporting */
  quiet?: boolean;
  /** Enable verbose output */
  verbose?: boolean;
  /** Dry run mode (validate but don't execute) */
  dryRun?: boolean;
  /** Output format (json, table, minimal) */
  format?: 'json' | 'table' | 'minimal';
}

export interface GenerateCommandResult extends CLIResult {
  data: {
    result: SampleDataResult;
    config: SampleDataConfig;
    schema: DatabaseSchema;
  };
}

// Clean Command Contracts

/**
 * clean-sample-data command
 * Usage: npm run clean-sample-data [options]
 */
export interface CleanCommand extends CLICommand {
  name: 'clean-sample-data';
  execute(args: string[], options: CleanCommandOptions): Promise<CleanCommandResult>;
}

export interface CleanCommandOptions {
  /** Specific tables to clean (comma-separated) */
  tables?: string;
  /** Force cleanup without confirmation prompts */
  force?: boolean;
  /** Dry run mode (show what would be deleted) */
  dryRun?: boolean;
  /** Enable verbose output */
  verbose?: boolean;
  /** Output format */
  format?: 'json' | 'table' | 'minimal';
}

export interface CleanCommandResult extends CLIResult {
  data: {
    tablesAffected: string[];
    recordsRemoved: number;
    errors: GenerationError[];
  };
}

// Status Command Contracts

/**
 * sample-data-status command
 * Usage: npm run sample-data-status [options]
 */
export interface StatusCommand extends CLICommand {
  name: 'sample-data-status';
  execute(args: string[], options: StatusCommandOptions): Promise<StatusCommandResult>;
}

export interface StatusCommandOptions {
  /** Show detailed per-table statistics */
  detailed?: boolean;
  /** Output format */
  format?: 'json' | 'table' | 'minimal';
  /** Show only tables with sample data */
  sampleOnly?: boolean;
}

export interface StatusCommandResult extends CLIResult {
  data: {
    hasSampleData: boolean;
    tableStats: Array<{
      tableName: string;
      sampleRecords: number;
      totalRecords: number;
      lastGenerated?: Date;
      priority: number;
    }>;
    overallStats: {
      totalSampleRecords: number;
      totalTables: number;
      tablesWithSampleData: number;
      lastGenerationRun?: Date;
    };
  };
}

// Validate Command Contracts

/**
 * validate-sample-config command
 * Usage: npm run validate-sample-config [options]
 */
export interface ValidateCommand extends CLICommand {
  name: 'validate-sample-config';
  execute(args: string[], options: ValidateCommandOptions): Promise<ValidateCommandResult>;
}

export interface ValidateCommandOptions {
  /** Configuration file to validate */
  config?: string;
  /** Check table dependencies */
  checkDependencies?: boolean;
  /** Validate against current database schema */
  checkSchema?: boolean;
  /** Output format */
  format?: 'json' | 'table' | 'minimal';
}

export interface ValidateCommandResult extends CLIResult {
  data: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    checkedItems: string[];
  };
}

// Schema Command Contracts

/**
 * discover-schema command
 * Usage: npm run discover-schema [options]
 */
export interface SchemaCommand extends CLICommand {
  name: 'discover-schema';
  execute(args: string[], options: SchemaCommandOptions): Promise<SchemaCommandResult>;
}

export interface SchemaCommandOptions {
  /** Output schema to file */
  output?: string;
  /** Include only specific tables */
  tables?: string;
  /** Include relationship information */
  includeRelations?: boolean;
  /** Output format */
  format?: 'json' | 'sql' | 'typescript';
}

export interface SchemaCommandResult extends CLIResult {
  data: {
    schema: DatabaseSchema;
    tableCount: number;
    relationshipCount: number;
    enumCount: number;
  };
}

// Makefile Integration Contracts

/**
 * Makefile target: dev-sample-data
 * Primary entry point for sample data generation
 */
export interface MakeTarget {
  /** Target name */
  name: 'dev-sample-data' | 'clean-sample-data' | 'sample-data-status';
  /** Command to execute */
  command: string;
  /** Target description */
  description: string;
  /** Dependencies */
  dependencies?: string[];
}

/**
 * Expected Makefile targets
 */
export const MAKEFILE_TARGETS: MakeTarget[] = [
  {
    name: 'dev-sample-data',
    command: 'cd backend && npm run generate-sample-data',
    description: 'Generate comprehensive sample data for development',
    dependencies: ['node_modules']
  },
  {
    name: 'clean-sample-data',
    command: 'cd backend && npm run clean-sample-data',
    description: 'Remove all sample data from database'
  },
  {
    name: 'sample-data-status',
    command: 'cd backend && npm run sample-data-status',
    description: 'Show current sample data status'
  }
];

// Configuration File Contracts

/**
 * Configuration file interface
 * Expected at: backend/config/sample-data.json
 */
export interface ConfigFile {
  /** File format version */
  version: string;
  /** Sample data configuration */
  config: SampleDataConfig;
  /** Environment-specific overrides */
  environments?: Record<string, Partial<SampleDataConfig>>;
  /** Metadata */
  metadata: {
    createdAt: string;
    lastModified: string;
    description: string;
  };
}

// Package.json Script Contracts

/**
 * Expected npm scripts in backend/package.json
 */
export interface PackageScripts {
  'generate-sample-data': string;
  'clean-sample-data': string;
  'sample-data-status': string;
  'validate-sample-config': string;
  'discover-schema': string;
}

export const EXPECTED_SCRIPTS: PackageScripts = {
  'generate-sample-data': 'tsx scripts/generate-sample-data.ts',
  'clean-sample-data': 'tsx scripts/clean-sample-data.ts',
  'sample-data-status': 'tsx scripts/sample-data-status.ts',
  'validate-sample-config': 'tsx scripts/validate-sample-config.ts',
  'discover-schema': 'tsx scripts/discover-schema.ts'
};

// Output Formatting Contracts

/**
 * Console output formatting utilities
 */
export interface OutputFormatter {
  /** Format as JSON */
  json(data: any): string;
  /** Format as table */
  table(data: any[], headers?: string[]): string;
  /** Format as minimal text */
  minimal(data: any): string;
  /** Format error messages */
  error(message: string, details?: any): string;
  /** Format success messages */
  success(message: string, details?: any): string;
  /** Format warning messages */
  warning(message: string, details?: any): string;
}

// Environment Configuration

/**
 * Environment variables used by CLI commands
 */
export interface EnvironmentConfig {
  /** Database connection URL */
  DATABASE_URL?: string;
  /** PostGraphile endpoint */
  GRAPHQL_ENDPOINT?: string;
  /** Configuration file path */
  SAMPLE_DATA_CONFIG?: string;
  /** Default batch size */
  SAMPLE_DATA_BATCH_SIZE?: string;
  /** Default seed value */
  SAMPLE_DATA_SEED?: string;
  /** Enable debug output */
  SAMPLE_DATA_DEBUG?: string;
}

// Error Handling Contracts

/**
 * Standard CLI error codes
 */
export enum CLIErrorCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGUMENTS = 2,
  DATABASE_ERROR = 3,
  CONFIGURATION_ERROR = 4,
  VALIDATION_ERROR = 5,
  SCHEMA_ERROR = 6,
  PERMISSION_ERROR = 7,
  NETWORK_ERROR = 8,
  TIMEOUT_ERROR = 9,
  INTERRUPT_ERROR = 130
}

/**
 * CLI error handling interface
 */
export interface CLIErrorHandler {
  /** Handle and format errors */
  handle(error: Error, command: string): CLIResult;
  /** Get exit code for error type */
  getExitCode(error: Error): CLIErrorCode;
  /** Format error message for CLI output */
  formatError(error: Error): string;
}

// Testing Contracts

/**
 * CLI command test interface
 */
export interface CLICommandTest {
  /** Test command execution */
  testExecution(command: CLICommand, args: string[], options: any): Promise<void>;
  /** Test error handling */
  testErrorHandling(command: CLICommand): Promise<void>;
  /** Test output formatting */
  testOutputFormatting(command: CLICommand): Promise<void>;
  /** Test help generation */
  testHelpGeneration(command: CLICommand): Promise<void>;
}

/**
 * Integration test interface for CLI workflows
 */
export interface CLIIntegrationTest {
  /** Test full generation workflow */
  testGenerationWorkflow(): Promise<void>;
  /** Test cleanup workflow */
  testCleanupWorkflow(): Promise<void>;
  /** Test status reporting */
  testStatusReporting(): Promise<void>;
  /** Test configuration validation */
  testConfigValidation(): Promise<void>;
  /** Test error recovery */
  testErrorRecovery(): Promise<void>;
}