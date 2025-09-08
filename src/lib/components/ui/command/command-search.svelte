<script lang="ts">
	import * as Command from './index.js';
	import { Search } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let {
		placeholder = 'Search...',
		value = $bindable(''),
		onValueChange,
		class: className = '',
		...restProps
	} = $props();

	// Add state to control palette visibility with delay
	let showPalette = $state(false);

	// HR-related search items
	const searchItems = [
		{
			id: 1,
			title: 'Find Employees',
			description: 'Search through employee directory',
			icon: '👥',
			group: 'Navigation'
		},
		{
			id: 2,
			title: 'View Reports',
			description: 'Access analytics and reports',
			icon: '📊',
			group: 'Navigation'
		},
		{
			id: 3,
			title: 'Calendar Events',
			description: 'Check upcoming meetings',
			icon: '📅',
			group: 'Navigation'
		},
		{
			id: 4,
			title: 'Settings',
			description: 'Manage your preferences',
			icon: '⚙️',
			group: 'Navigation'
		},
		{
			id: 5,
			title: 'Submit Time Off',
			description: 'Request vacation or sick leave',
			icon: '🏖️',
			group: 'Actions'
		},
		{
			id: 6,
			title: 'Performance Review',
			description: 'View or submit performance data',
			icon: '⭐',
			group: 'Actions'
		},
		{
			id: 7,
			title: 'Payroll',
			description: 'View pay stubs and tax info',
			icon: '💰',
			group: 'Employee'
		},
		{
			id: 8,
			title: 'Benefits',
			description: 'Manage health and insurance',
			icon: '🏥',
			group: 'Employee'
		}
	];

	let filteredItems = $derived(
		searchItems.filter(
			(item) =>
				item.title.toLowerCase().includes((value || '').toLowerCase()) ||
				item.description.toLowerCase().includes((value || '').toLowerCase())
		)
	);

	let groupedItems = $derived.by(() => {
		const groups: Record<string, typeof searchItems> = {};
		filteredItems.forEach((item) => {
			if (!groups[item.group]) {
				groups[item.group] = [];
			}
			groups[item.group].push(item);
		});
		return groups;
	});

	function handleSelect(item: (typeof searchItems)[0]) {
		dispatch('select', { item });
		value = '';
		showPalette = false;
	}

	// Watch for value changes and control palette visibility
	$effect(() => {
		if (value && value.length > 0) {
			// Delay showing the palette to let the search bar slide out first
			setTimeout(() => {
				showPalette = true;
			}, 250); // 250ms delay to match the search bar animation
		} else {
			showPalette = false;
		}
	});
</script>

<div class="relative w-80">
	<Command.Root
		bind:value
		onValueChange={(newValue) => {
			value = newValue;
			onValueChange?.(newValue);
		}}
		onKeydown={(e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				// Find the first filtered item and select it
				const firstItem = Object.values(groupedItems)[0]?.[0];
				if (firstItem) {
					handleSelect(firstItem);
				}
			}
		}}
		class="command-search-root {className}"
		{...restProps}
	>
		<Command.Input {placeholder} class="command-search-input" />

		<Command.List
			class="command-search-list"
			style={showPalette ? 'display: block;' : 'display: none;'}
		>
			{#if Object.keys(groupedItems).length > 0}
				{#each Object.entries(groupedItems) as [groupName, items] (groupName)}
					<Command.Group heading={groupName}>
						{#each items as item (item.id)}
							<Command.Item
								value={item.title}
								class="command-search-item"
								onclick={() => handleSelect(item)}
							>
								<span class="command-item-icon">{item.icon}</span>
								<div class="command-item-content">
									<div class="command-item-title">{item.title}</div>
									<div class="command-item-description">{item.description}</div>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
			{:else if value}
				<Command.Empty>No results found.</Command.Empty>
			{/if}
		</Command.List>
	</Command.Root>
</div>

<style>
	/* Root container */
	:global(.command-search-root) {
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
	}

	/* Input wrapper from shadcn */
	:global([data-slot='command-input-wrapper']) {
		background: rgba(255, 255, 255, 0.2) !important;
		backdrop-filter: blur(12px) !important;
		border: 1px solid rgba(255, 255, 255, 0.3) !important;
		border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
		border-radius: 9999px !important;
		height: 3rem !important;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
		padding-left: 1.25rem !important;
		padding-right: 1rem !important;
		transition: all 0.2s !important;
		gap: 0.75rem !important;
	}

	:global([data-slot='command-input-wrapper']:focus-within) {
		background: rgba(255, 255, 255, 0.9) !important;
		border: 1px solid rgba(255, 255, 255, 0.6) !important;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(255, 255, 255, 0.1) !important;
	}

	/* Input styling */
	:global([data-slot='command-input']) {
		background: transparent !important;
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
		font-size: 1rem !important;
		color: inherit !important;
		flex: 1 !important;
		height: auto !important;
		padding: 0 !important;
	}

	/* Search results list */
	:global(.command-search-list) {
		position: absolute;
		top: 3.5rem;
		left: 0;
		right: 0;
		max-height: 20rem;
		overflow-y: auto;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.2) !important;
		backdrop-filter: blur(12px) !important;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
		padding: 0.5rem;
		z-index: 50;
		opacity: 0;
		transform: translateX(20px) translateY(-5px);
		transition:
			opacity 0.3s ease-out,
			transform 0.3s ease-out;
	}

	:global(.command-search-list[style*='display: block']) {
		opacity: 1;
		transform: translateX(0) translateY(0);
	}

	/* Search result items */
	:global(.command-search-item) {
		display: flex !important;
		align-items: center !important;
		gap: 0.75rem !important;
		border-radius: 1rem !important;
		padding: 0.75rem 1rem !important;
		transition: all 0.2s !important;
		cursor: pointer !important;
		color: rgb(156 163 175) !important;
		background: transparent !important;
	}

	:global(.command-search-item:hover),
	:global(.command-search-item[aria-selected='true']) {
		background: rgba(255, 255, 255, 0.3) !important;
		color: inherit !important;
	}

	/* Item content */
	:global(.command-item-icon) {
		font-size: 1.125rem;
	}

	:global(.command-item-content) {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	:global(.command-item-title) {
		font-size: 0.875rem;
		font-weight: 500;
	}

	:global(.command-item-description) {
		font-size: 0.75rem;
		color: rgb(156 163 175);
	}

	/* Group headings */
	:global([data-slot='command-group']) {
		background: transparent !important;
	}

	:global([data-slot='command-group'] .text-muted-foreground) {
		color: rgb(156 163 175) !important;
		font-weight: 600 !important;
		text-transform: uppercase !important;
		letter-spacing: 0.05em !important;
		font-size: 0.75rem !important;
		padding: 0.5rem 1rem 0.25rem 1rem !important;
	}

	/* Empty state */
	:global([data-slot='command-empty']) {
		padding: 1.5rem;
		text-align: center;
		color: rgb(156 163 175);
		font-size: 0.875rem;
	}

	/* Override any bits-ui defaults */
	:global([data-slot='command']),
	:global([data-slot='command-list']),
	:global([data-slot='command-group']),
	:global([data-slot='command-item']) {
		background: transparent !important;
		border: none !important;
	}
</style>
