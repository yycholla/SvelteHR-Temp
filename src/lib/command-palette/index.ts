/**
 * Command Palette
 *
 * Main export file for the command palette system.
 */

export { CommandRegistry } from './registry';
export type { Command, CommandCategory, CommandPaletteState, RecentCommand } from './types';

// Import command sets
import { quickbooksCommands } from './commands/quickbooks';
import { navigationCommands } from './commands/navigation';
import { digestCommands } from './commands/digests';
import { CommandRegistry } from './registry';

/**
 * Initialize all commands
 */
export function initializeCommands(): void {
	// Register QuickBooks commands
	CommandRegistry.registerMany(quickbooksCommands);

	// Register navigation commands
	CommandRegistry.registerMany(navigationCommands);

	// Register email digest commands
	CommandRegistry.registerMany(digestCommands);
}

/**
 * Register a custom command
 */
export function registerCommand(command: import('./types').Command): void {
	CommandRegistry.register(command);
}

/**
 * Execute a command by ID
 */
export async function executeCommand(commandId: string): Promise<void> {
	await CommandRegistry.execute(commandId);
}

/**
 * Search for commands
 */
export function searchCommands(
	query: string,
	userPermissions?: string[]
): import('./types').Command[] {
	return CommandRegistry.search(query, userPermissions);
}
