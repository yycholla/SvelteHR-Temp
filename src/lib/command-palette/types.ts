/**
 * Command Palette Types
 *
 * Type definitions for the command palette system.
 */

export type CommandCategory = 'Sync' | 'Navigate' | 'Settings' | 'Help' | 'Utilities';

export interface Command {
	/** Unique identifier for the command */
	id: string;

	/** Display label shown in the palette */
	label: string;

	/** Optional description for additional context */
	description?: string;

	/** Icon (emoji or icon name) */
	icon?: string;

	/** Category for grouping commands */
	category: CommandCategory;

	/** Keyboard shortcut (e.g., "Cmd+Shift+E") */
	shortcut?: string;

	/** Keywords for fuzzy search matching */
	keywords?: string[];

	/** Function to execute when command is triggered */
	action: () => void | Promise<void>;

	/** Required permission to use this command */
	permission?: string;

	/** Whether command is enabled */
	enabled?: boolean;
}

export interface RecentCommand {
	/** Command ID */
	commandId: string;

	/** Timestamp of last execution */
	lastExecuted: Date;

	/** Number of times executed */
	executionCount: number;
}

export interface CommandPaletteState {
	/** Whether the palette is open */
	open: boolean;

	/** Current search query */
	query: string;

	/** Filtered commands based on query */
	filteredCommands: Command[];

	/** Currently selected command index */
	selectedIndex: number;

	/** Recent commands */
	recentCommands: RecentCommand[];
}
