/**
 * CLI Command Registry Implementation
 *
 * Manages registration, lookup, and execution of CLI commands.
 * Provides a central registry for all available sample data commands.
 */

import {
  CLICommand,
  CLICommandRegistry as ICLICommandRegistry,
  CLIOptions,
  CLIResult,
  createErrorResult
} from '../models/CLIInterface';
import { CLIError } from '../models/Errors';

/**
 * Implementation of the CLI command registry.
 */
export class CLICommandRegistry implements ICLICommandRegistry {
  public commands: Map<string, CLICommand>;
  private aliases: Map<string, string>;

  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
  }

  /**
   * Registers a new command.
   *
   * @param command - Command to register
   */
  register(command: CLICommand): void {
    // Register main command
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
  }

  /**
   * Unregisters a command.
   *
   * @param name - Command name to unregister
   */
  unregister(name: string): void {
    const command = this.commands.get(name);

    if (command) {
      // Remove aliases
      if (command.aliases) {
        for (const alias of command.aliases) {
          this.aliases.delete(alias);
        }
      }

      // Remove command
      this.commands.delete(name);
    }
  }

  /**
   * Gets a command by name or alias.
   *
   * @param name - Command name or alias
   * @returns Command or undefined if not found
   */
  get(name: string): CLICommand | undefined {
    // Check if it's a direct command name
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // Check if it's an alias
    const actualName = this.aliases.get(name);
    if (actualName) {
      return this.commands.get(actualName);
    }

    return undefined;
  }

  /**
   * Lists all registered commands.
   *
   * @returns Array of all commands
   */
  list(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Executes a command.
   *
   * @param name - Command name or alias
   * @param args - Command arguments
   * @param options - Command options
   * @returns Command result
   */
  async execute(name: string, args?: any[], options?: CLIOptions): Promise<CLIResult> {
    const command = this.get(name);

    if (!command) {
      return createErrorResult(
        `Command not found: ${name}`,
        `Unknown command '${name}'. Use 'help' to see available commands.`,
        1
      );
    }

    try {
      // Execute command handler
      const result = await command.handler(args, options);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (error instanceof CLIError) {
        return createErrorResult(
          `Command '${name}' failed`,
          errorMessage,
          error.exitCode || 1
        );
      }

      return createErrorResult(`Command '${name}' failed`, errorMessage, 1);
    }
  }

  /**
   * Checks if a command exists.
   *
   * @param name - Command name or alias
   * @returns True if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  /**
   * Gets the number of registered commands.
   *
   * @returns Number of commands
   */
  get count(): number {
    return this.commands.size;
  }

  /**
   * Clears all registered commands.
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }
}
