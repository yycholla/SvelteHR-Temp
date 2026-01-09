<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { CommandRegistry } from '$lib/command-palette/registry';
	import type { Command } from '$lib/command-palette/types';
	import { onMount } from 'svelte';

	interface Props {
		userPermissions?: string[];
	}

	let { userPermissions = [] }: Props = $props();

	// State
	let open = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let filteredCommands = $state<Command[]>([]);
	let dialogElement: HTMLDialogElement | undefined = $state();

	// Compute filtered commands when query changes
	$effect(() => {
		if (browser && open) {
			filteredCommands = CommandRegistry.search(query, userPermissions);
			selectedIndex = 0; // Reset selection when query changes
		}
	});

	// Global keyboard handler
	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Cmd+K or Ctrl+K to open
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				openPalette();
				return;
			}

			// ESC to close
			if (e.key === 'Escape' && open) {
				e.preventDefault();
				closePalette();
				return;
			}

			// Arrow keys for navigation (only when open)
			if (open) {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
				} else if (e.key === 'ArrowUp') {
					e.preventDefault();
					selectedIndex = Math.max(selectedIndex - 1, 0);
				} else if (e.key === 'Enter') {
					e.preventDefault();
					executeSelectedCommand();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	function openPalette() {
		open = true;
		query = '';
		selectedIndex = 0;
		filteredCommands = CommandRegistry.search('', userPermissions);

		// Focus search input
		setTimeout(() => {
			dialogElement?.querySelector('input')?.focus();
		}, 50);
	}

	function closePalette() {
		open = false;
		query = '';
		selectedIndex = 0;
	}

	async function executeSelectedCommand() {
		const command = filteredCommands[selectedIndex];
		if (!command) return;

		closePalette();

		try {
			await CommandRegistry.execute(command.id);
		} catch (error) {
			console.error('Failed to execute command:', error);
		}
	}

	function executeCommand(command: Command) {
		closePalette();

		try {
			CommandRegistry.execute(command.id);
		} catch (error) {
			console.error('Failed to execute command:', error);
		}
	}

	// Group commands by category
	function groupCommandsByCategory(commands: Command[]): Map<string, Command[]> {
		const groups = new Map<string, Command[]>();

		for (const command of commands) {
			const existing = groups.get(command.category) || [];
			existing.push(command);
			groups.set(command.category, existing);
		}

		return groups;
	}

	let groupedCommands = $derived(groupCommandsByCategory(filteredCommands));

	// Category order for display
	const categoryOrder = ['Sync', 'Navigate', 'Settings', 'Utilities', 'Help'];
</script>

{#if open}
	<dialog
		bind:this={dialogElement}
		class="command-palette-dialog"
		open
		onclick={(e) => {
			if (e.target === dialogElement) {
				closePalette();
			}
		}}
	>
		<div class="command-palette">
			<!-- Search Input -->
			<div class="search-container">
				<span class="search-icon">🔍</span>
				<input
					type="text"
					placeholder="Type a command or search..."
					bind:value={query}
					class="search-input"
				/>
				<kbd class="kbd">ESC</kbd>
			</div>

			<!-- Commands List -->
			<div class="commands-container">
				{#if filteredCommands.length === 0}
					<div class="no-results">
						<p>No commands found</p>
						<p class="text-sm text-muted-foreground">Try a different search term</p>
					</div>
				{:else}
					{#each categoryOrder as category}
						{#if groupedCommands.has(category)}
							<div class="command-group">
								<div class="command-group-label">{category}</div>
								{#each groupedCommands.get(category) || [] as command, index}
									{@const globalIndex = filteredCommands.indexOf(command)}
									<button
										class="command-item"
										class:selected={globalIndex === selectedIndex}
										onclick={() => executeCommand(command)}
										onmouseenter={() => (selectedIndex = globalIndex)}
									>
										<div class="command-info">
											{#if command.icon}
												<span class="command-icon">{command.icon}</span>
											{/if}
											<div class="command-text">
												<div class="command-label">{command.label}</div>
												{#if command.description}
													<div class="command-description">{command.description}</div>
												{/if}
											</div>
										</div>
										{#if command.shortcut}
											<kbd class="command-shortcut">{command.shortcut}</kbd>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="footer">
				<div class="footer-hint">
					<kbd class="kbd">↑↓</kbd> to navigate
					<kbd class="kbd">↵</kbd> to select
					<kbd class="kbd">ESC</kbd> to close
				</div>
			</div>
		</div>
	</dialog>
{/if}

<style>
	.command-palette-dialog {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 20vh 1rem 1rem;
		border: none;
		max-width: 100vw;
		max-height: 100vh;
	}

	.command-palette {
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 640px;
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.search-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.search-icon {
		font-size: 1.25rem;
	}

	.search-input {
		flex: 1;
		border: none;
		outline: none;
		font-size: 1rem;
		background: transparent;
	}

	.commands-container {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.no-results {
		padding: 3rem 1rem;
		text-align: center;
		color: #6b7280;
	}

	.command-group {
		margin-bottom: 1rem;
	}

	.command-group:last-child {
		margin-bottom: 0;
	}

	.command-group-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: #6b7280;
		padding: 0.5rem 0.75rem 0.25rem;
		letter-spacing: 0.05em;
	}

	.command-item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		border-radius: 6px;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background-color 0.15s;
		text-align: left;
	}

	.command-item:hover,
	.command-item.selected {
		background: #f3f4f6;
	}

	.command-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.command-icon {
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
	}

	.command-text {
		flex: 1;
	}

	.command-label {
		font-weight: 500;
		color: #111827;
	}

	.command-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.125rem;
	}

	.command-shortcut {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		font-family: ui-monospace, monospace;
		color: #6b7280;
	}

	.footer {
		border-top: 1px solid #e5e7eb;
		padding: 0.75rem 1rem;
		background: #f9fafb;
	}

	.footer-hint {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.kbd {
		font-size: 0.75rem;
		padding: 0.125rem 0.375rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 3px;
		font-family: ui-monospace, monospace;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.command-palette {
			background: #1f2937;
		}

		.search-container {
			border-bottom-color: #374151;
		}

		.search-input {
			color: white;
		}

		.command-group-label {
			color: #9ca3af;
		}

		.command-item:hover,
		.command-item.selected {
			background: #374151;
		}

		.command-label {
			color: white;
		}

		.command-description {
			color: #9ca3af;
		}

		.command-shortcut {
			background: #374151;
			border-color: #4b5563;
			color: #9ca3af;
		}

		.footer {
			border-top-color: #374151;
			background: #111827;
		}

		.footer-hint {
			color: #9ca3af;
		}

		.kbd {
			background: #374151;
			border-color: #4b5563;
		}
	}
</style>
