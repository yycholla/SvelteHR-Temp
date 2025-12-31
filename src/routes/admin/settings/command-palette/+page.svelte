<script lang="ts">
	import { CommandRegistry } from '$lib/command-palette';
	import type { Command } from '$lib/command-palette/types';
	import { onMount } from 'svelte';

	let { data } = $props();

	let allCommands: Command[] = $state([]);
	let recentCommands = $state<Array<{ command: Command; executionCount: number }>>([]);
	let commandsByCategory = $state<Map<string, Command[]>>(new Map());
	let mounted = $state(false);

	onMount(() => {
		mounted = true;

		// Get all commands
		allCommands = CommandRegistry.getAll().filter((cmd) => {
			// Filter by user permissions
			if (!cmd.permission) return true;
			return data?.permissions?.includes(cmd.permission);
		});

		// Group by category
		const groups = new Map<string, Command[]>();
		for (const command of allCommands) {
			const existing = groups.get(command.category) || [];
			existing.push(command);
			groups.set(command.category, existing);
		}
		commandsByCategory = groups;

		// Get recent commands with command details
		const recent = CommandRegistry.getRecentCommands();
		recentCommands = recent
			.map((rc) => {
				const command = CommandRegistry.get(rc.commandId);
				if (!command) return null;
				return {
					command,
					executionCount: rc.executionCount
				};
			})
			.filter((rc) => rc !== null);
	});

	function clearRecentCommands() {
		if (confirm('Are you sure you want to clear recent commands?')) {
			CommandRegistry.clearRecentCommands();
			recentCommands = [];
		}
	}

	const categoryOrder = ['Sync', 'Navigate', 'Settings', 'Utilities', 'Help'];
</script>

<div class="container mx-auto p-6 max-w-6xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Command Palette</h1>
		<p class="text-muted-foreground">
			Quick access to all features using keyboard shortcuts. Press <kbd
				class="px-2 py-1 bg-muted rounded border text-sm">Cmd+K</kbd
			>
			or
			<kbd class="px-2 py-1 bg-muted rounded border text-sm">Ctrl+K</kbd> to open.
		</p>
	</div>

	{#if mounted}
		<!-- Recent Commands -->
		{#if recentCommands.length > 0}
			<div class="mb-8 p-6 bg-card rounded-lg border">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-xl font-semibold">Recent Commands</h2>
					<button
						onclick={clearRecentCommands}
						class="text-sm text-muted-foreground hover:text-foreground"
					>
						Clear History
					</button>
				</div>
				<div class="space-y-2">
					{#each recentCommands as { command, executionCount }}
						<div class="flex items-center justify-between p-3 bg-muted/50 rounded">
							<div class="flex items-center gap-3">
								{#if command.icon}
									<span class="text-xl">{command.icon}</span>
								{/if}
								<div>
									<div class="font-medium">{command.label}</div>
									{#if command.description}
										<div class="text-sm text-muted-foreground">{command.description}</div>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-3">
								<span class="text-sm text-muted-foreground">Used {executionCount} time{executionCount === 1 ? '' : 's'}</span>
								{#if command.shortcut}
									<kbd class="px-2 py-1 bg-background rounded border text-sm">
										{command.shortcut}
									</kbd>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- All Commands by Category -->
		<div class="space-y-6">
			<h2 class="text-xl font-semibold">All Commands</h2>

			{#each categoryOrder as category}
				{#if commandsByCategory.has(category)}
					<div class="p-6 bg-card rounded-lg border">
						<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
							{category}
							<span class="text-sm font-normal text-muted-foreground">
								({commandsByCategory.get(category)?.length} commands)
							</span>
						</h3>
						<div class="space-y-2">
							{#each commandsByCategory.get(category) || [] as command}
								<div class="flex items-center justify-between p-3 hover:bg-muted/50 rounded">
									<div class="flex items-center gap-3 flex-1">
										{#if command.icon}
											<span class="text-xl">{command.icon}</span>
										{/if}
										<div class="flex-1">
											<div class="font-medium">{command.label}</div>
											{#if command.description}
												<div class="text-sm text-muted-foreground">{command.description}</div>
											{/if}
											{#if command.keywords && command.keywords.length > 0}
												<div class="text-xs text-muted-foreground mt-1">
													Keywords: {command.keywords.join(', ')}
												</div>
											{/if}
										</div>
									</div>
									<div class="flex items-center gap-3">
										{#if command.permission}
											<span
												class="text-xs px-2 py-1 bg-muted rounded"
												title="Required permission"
											>
												🔒 {command.permission}
											</span>
										{/if}
										{#if command.shortcut}
											<kbd class="px-2 py-1 bg-muted rounded border text-sm">
												{command.shortcut}
											</kbd>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Tips & Tricks -->
		<div class="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
			<h3 class="text-lg font-semibold mb-3">💡 Tips & Tricks</h3>
			<ul class="space-y-2 text-sm">
				<li class="flex items-start gap-2">
					<span class="text-blue-600 dark:text-blue-400">•</span>
					<span
						>Use <kbd class="px-1 py-0.5 bg-white dark:bg-gray-800 rounded border text-xs"
							>Cmd+K</kbd
						> or <kbd class="px-1 py-0.5 bg-white dark:bg-gray-800 rounded border text-xs"
							>Ctrl+K</kbd
						> to quickly open the command palette from anywhere</span
					>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-600 dark:text-blue-400">•</span>
					<span>Type to search through all available commands - no need to remember exact names</span
					>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-600 dark:text-blue-400">•</span>
					<span>Use arrow keys to navigate and Enter to execute</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-600 dark:text-blue-400">•</span>
					<span>Your most frequently used commands will appear in the Recent Commands section</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-blue-600 dark:text-blue-400">•</span>
					<span
						>Many commands have keyboard shortcuts you can use directly (shown on the right)</span
					>
				</li>
			</ul>
		</div>
	{/if}
</div>

<style>
	kbd {
		font-family: ui-monospace, monospace;
	}
</style>
