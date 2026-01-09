/**
 * Command Registry
 *
 * Centralized registry for managing all available commands in the application.
 */

import type { Command, RecentCommand } from './types';

const RECENT_COMMANDS_KEY = 'commandPalette:recentCommands';
const MAX_RECENT_COMMANDS = 10;

class CommandRegistryClass {
	private commands: Map<string, Command> = new Map();
	private recentCommands: RecentCommand[] = [];

	constructor() {
		this.loadRecentCommands();
	}

	/**
	 * Register a new command
	 */
	register(command: Command): void {
		this.commands.set(command.id, command);
	}

	/**
	 * Register multiple commands at once
	 */
	registerMany(commands: Command[]): void {
		commands.forEach((cmd) => this.register(cmd));
	}

	/**
	 * Unregister a command
	 */
	unregister(commandId: string): void {
		this.commands.delete(commandId);
	}

	/**
	 * Get a command by ID
	 */
	get(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Get all registered commands
	 */
	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Search commands using fuzzy matching
	 */
	search(query: string, userPermissions?: string[]): Command[] {
		if (!query.trim()) {
			return this.getAll().filter((cmd) => this.hasPermission(cmd, userPermissions));
		}

		const lowerQuery = query.toLowerCase();
		const commands = this.getAll();

		return commands
			.filter((cmd) => {
				// Check permission first
				if (!this.hasPermission(cmd, userPermissions)) {
					return false;
				}

				// Check if disabled
				if (cmd.enabled === false) {
					return false;
				}

				// Search in label
				if (cmd.label.toLowerCase().includes(lowerQuery)) {
					return true;
				}

				// Search in description
				if (cmd.description?.toLowerCase().includes(lowerQuery)) {
					return true;
				}

				// Search in keywords
				if (cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
					return true;
				}

				// Search in category
				if (cmd.category.toLowerCase().includes(lowerQuery)) {
					return true;
				}

				return false;
			})
			.sort((a, b) => {
				// Sort by relevance (exact match > starts with > contains)
				const aLabel = a.label.toLowerCase();
				const bLabel = b.label.toLowerCase();

				if (aLabel === lowerQuery) return -1;
				if (bLabel === lowerQuery) return 1;

				if (aLabel.startsWith(lowerQuery)) return -1;
				if (bLabel.startsWith(lowerQuery)) return 1;

				return aLabel.localeCompare(bLabel);
			});
	}

	/**
	 * Execute a command and track it in recent commands
	 */
	async execute(commandId: string): Promise<void> {
		const command = this.get(commandId);
		if (!command) {
			console.error(`Command not found: ${commandId}`);
			return;
		}

		// Execute the command
		await command.action();

		// Track in recent commands
		this.trackRecentCommand(commandId);
	}

	/**
	 * Get recent commands
	 */
	getRecentCommands(): RecentCommand[] {
		return this.recentCommands;
	}

	/**
	 * Track a command execution in recent history
	 */
	private trackRecentCommand(commandId: string): void {
		const existingIndex = this.recentCommands.findIndex((rc) => rc.commandId === commandId);

		if (existingIndex >= 0) {
			// Update existing entry
			const existing = this.recentCommands[existingIndex];
			this.recentCommands.splice(existingIndex, 1);
			this.recentCommands.unshift({
				commandId,
				lastExecuted: new Date(),
				executionCount: existing.executionCount + 1
			});
		} else {
			// Add new entry
			this.recentCommands.unshift({
				commandId,
				lastExecuted: new Date(),
				executionCount: 1
			});
		}

		// Keep only MAX_RECENT_COMMANDS
		if (this.recentCommands.length > MAX_RECENT_COMMANDS) {
			this.recentCommands = this.recentCommands.slice(0, MAX_RECENT_COMMANDS);
		}

		this.saveRecentCommands();
	}

	/**
	 * Check if user has permission to execute command
	 */
	private hasPermission(command: Command, userPermissions?: string[]): boolean {
		if (!command.permission) {
			return true;
		}

		if (!userPermissions) {
			return false;
		}

		return userPermissions.includes(command.permission);
	}

	/**
	 * Load recent commands from localStorage
	 */
	private loadRecentCommands(): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.recentCommands = parsed.map((rc: RecentCommand) => ({
					...rc,
					lastExecuted: new Date(rc.lastExecuted)
				}));
			}
		} catch (error) {
			console.error('Failed to load recent commands:', error);
		}
	}

	/**
	 * Save recent commands to localStorage
	 */
	private saveRecentCommands(): void {
		if (typeof window === 'undefined') return;

		try {
			localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(this.recentCommands));
		} catch (error) {
			console.error('Failed to save recent commands:', error);
		}
	}

	/**
	 * Clear all recent commands
	 */
	clearRecentCommands(): void {
		this.recentCommands = [];
		this.saveRecentCommands();
	}
}

// Export singleton instance
export const CommandRegistry = new CommandRegistryClass();
