/**
 * CLI Interface Model
 *
 * Defines the command-line interface structure for sample data operations,
 * including commands, options, arguments, and result formats.
 */

/**
 * Output format options for CLI commands.
 */
export enum OutputFormat {
  JSON = 'json',
  TABLE = 'table',
  MINIMAL = 'minimal'
}

/**
 * Log level options for CLI output.
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * CLI command options.
 */
export interface CLIOptions {
  /** Output format (json, table, minimal) */
  format: OutputFormat;

  /** Enable verbose output */
  verbose: boolean;

  /** Dry run mode (don't actually make changes) */
  dryRun: boolean;

  /** Log level for output */
  logLevel: LogLevel;
}

/**
 * CLI command result.
 */
export interface CLIResult {
  /** Whether the command succeeded */
  success: boolean;

  /** Result message */
  message: string;

  /** Result data (structure varies by command) */
  data?: any;

  /** Error message if command failed */
  error?: string;

  /** Exit code (0 for success, non-zero for failure) */
  exitCode?: number;
}

/**
 * CLI argument definition.
 */
export interface CLIArgumentDefinition {
  /** Argument name */
  name: string;

  /** Argument description */
  description: string;

  /** Whether the argument is required */
  required: boolean;

  /** Argument type */
  type: 'string' | 'number' | 'boolean';

  /** Default value (if not required) */
  defaultValue?: any;

  /** Validation regex (for string arguments) */
  validation?: RegExp;

  /** List of valid choices (for enum-like arguments) */
  choices?: string[];
}

/**
 * CLI command definition.
 */
export interface CLICommand {
  /** Command name */
  name: string;

  /** Command description */
  description: string;

  /** Command arguments */
  arguments: CLIArgumentDefinition[];

  /** Command options */
  options: CLIOptions;

  /** Command handler function */
  handler: (args?: any[], options?: CLIOptions) => Promise<CLIResult>;

  /** Command aliases */
  aliases?: string[];

  /** Examples of command usage */
  examples?: string[];

  /** Long description with additional details */
  longDescription?: string;
}

/**
 * CLI command registry for managing available commands.
 */
export interface CLICommandRegistry {
  /** Map of command names to command definitions */
  commands: Map<string, CLICommand>;

  /** Register a new command */
  register: (command: CLICommand) => void;

  /** Unregister a command */
  unregister: (name: string) => void;

  /** Get a command by name or alias */
  get: (name: string) => CLICommand | undefined;

  /** List all registered commands */
  list: () => CLICommand[];

  /** Execute a command */
  execute: (name: string, args?: any[], options?: CLIOptions) => Promise<CLIResult>;
}

/**
 * Creates default CLI options.
 *
 * @returns Default CLI options
 */
export function createDefaultCLIOptions(): CLIOptions {
  return {
    format: OutputFormat.JSON,
    verbose: false,
    dryRun: false,
    logLevel: LogLevel.INFO
  };
}

/**
 * Creates a successful CLI result.
 *
 * @param message - Success message
 * @param data - Optional result data
 * @returns CLI result object
 */
export function createSuccessResult(message: string, data?: any): CLIResult {
  return {
    success: true,
    message,
    data,
    exitCode: 0
  };
}

/**
 * Creates an error CLI result.
 *
 * @param message - Error message
 * @param error - Detailed error information
 * @param exitCode - Exit code (defaults to 1)
 * @returns CLI result object
 */
export function createErrorResult(message: string, error?: string, exitCode = 1): CLIResult {
  return {
    success: false,
    message,
    error,
    exitCode
  };
}

/**
 * Validates CLI arguments against their definitions.
 *
 * @param args - Provided arguments
 * @param definitions - Argument definitions
 * @throws {Error} If validation fails
 */
export function validateCLIArguments(args: any[], definitions: CLIArgumentDefinition[]): void {
  const requiredArgs = definitions.filter(def => def.required);

  if (args.length < requiredArgs.length) {
    throw new Error(
      `Missing required arguments. Expected at least ${requiredArgs.length}, got ${args.length}`
    );
  }

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    const arg = args[i];

    if (arg === undefined) {
      if (def.required) {
        throw new Error(`Missing required argument: ${def.name}`);
      }
      continue;
    }

    // Type validation
    const actualType = typeof arg;
    if (def.type === 'number' && actualType !== 'number') {
      throw new Error(`Argument '${def.name}' must be a number, got ${actualType}`);
    }
    if (def.type === 'boolean' && actualType !== 'boolean') {
      throw new Error(`Argument '${def.name}' must be a boolean, got ${actualType}`);
    }
    if (def.type === 'string' && actualType !== 'string') {
      throw new Error(`Argument '${def.name}' must be a string, got ${actualType}`);
    }

    // Pattern validation
    if (def.type === 'string' && def.validation && !def.validation.test(arg)) {
      throw new Error(`Argument '${def.name}' does not match required pattern`);
    }

    // Choice validation
    if (def.choices && !def.choices.includes(arg)) {
      throw new Error(
        `Argument '${def.name}' must be one of: ${def.choices.join(', ')}, got ${arg}`
      );
    }
  }
}

/**
 * Formats a CLI result based on output format.
 *
 * @param result - CLI result to format
 * @param format - Output format
 * @returns Formatted string
 */
export function formatCLIResult(result: CLIResult, format: OutputFormat): string {
  switch (format) {
    case OutputFormat.JSON:
      return JSON.stringify(result, null, 2);

    case OutputFormat.MINIMAL:
      if (result.success) {
        return result.message;
      } else {
        return `Error: ${result.error || result.message}`;
      }

    case OutputFormat.TABLE:
      // For table format, assume data contains table results
      if (result.success && result.data && result.data.tableResults) {
        return formatAsTable(result.data.tableResults);
      } else {
        return result.message;
      }

    default:
      return JSON.stringify(result, null, 2);
  }
}

/**
 * Formats data as a table.
 *
 * @param data - Array of objects to format as table
 * @returns Table string
 */
function formatAsTable(data: any[]): string {
  if (data.length === 0) {
    return 'No data';
  }

  const keys = Object.keys(data[0]);
  const colWidths = keys.map(key => {
    const maxDataWidth = Math.max(...data.map(row => String(row[key]).length));
    return Math.max(key.length, maxDataWidth);
  });

  const lines: string[] = [];

  // Header separator
  const headerSep = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  lines.push(headerSep);

  // Header
  const header =
    '│ ' + keys.map((key, i) => key.padEnd(colWidths[i])).join(' │ ') + ' │';
  lines.push(header);

  // Header/data separator
  const dataSep = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  lines.push(dataSep);

  // Data rows
  for (const row of data) {
    const rowStr =
      '│ ' + keys.map((key, i) => String(row[key]).padEnd(colWidths[i])).join(' │ ') + ' │';
    lines.push(rowStr);
  }

  // Footer separator
  const footerSep = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
  lines.push(footerSep);

  return lines.join('\n');
}

/**
 * Generates help text for a command.
 *
 * @param command - Command to generate help for
 * @returns Help text string
 */
export function generateCommandHelp(command: CLICommand): string {
  const lines: string[] = [];

  lines.push(`Command: ${command.name}`);
  lines.push('');
  lines.push(`Description: ${command.description}`);

  if (command.longDescription) {
    lines.push('');
    lines.push(command.longDescription);
  }

  if (command.aliases && command.aliases.length > 0) {
    lines.push('');
    lines.push(`Aliases: ${command.aliases.join(', ')}`);
  }

  if (command.arguments.length > 0) {
    lines.push('');
    lines.push('Arguments:');
    for (const arg of command.arguments) {
      const required = arg.required ? 'required' : 'optional';
      lines.push(`  ${arg.name} (${arg.type}, ${required})`);
      lines.push(`    ${arg.description}`);
      if (arg.defaultValue !== undefined) {
        lines.push(`    Default: ${arg.defaultValue}`);
      }
      if (arg.choices) {
        lines.push(`    Choices: ${arg.choices.join(', ')}`);
      }
    }
  }

  lines.push('');
  lines.push('Options:');
  lines.push('  --format <format>    Output format (json, table, minimal)');
  lines.push('  --verbose            Enable verbose output');
  lines.push('  --dry-run            Dry run mode (no changes made)');
  lines.push('  --log-level <level>  Log level (debug, info, warn, error)');

  if (command.examples && command.examples.length > 0) {
    lines.push('');
    lines.push('Examples:');
    for (const example of command.examples) {
      lines.push(`  ${example}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generates help text for all commands in a registry.
 *
 * @param registry - Command registry
 * @returns Help text string
 */
export function generateRegistryHelp(registry: CLICommandRegistry): string {
  const commands = registry.list();
  const lines: string[] = [];

  lines.push('Available Commands:');
  lines.push('');

  for (const command of commands) {
    lines.push(`  ${command.name.padEnd(25)} ${command.description}`);
  }

  lines.push('');
  lines.push('Use "command --help" for more information about a specific command.');

  return lines.join('\n');
}
