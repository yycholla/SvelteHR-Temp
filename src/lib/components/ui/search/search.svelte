<script lang="ts">
	import { Search } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	let { placeholder = 'Search...', value = $bindable(''), onValueChange, ...restProps } = $props();

	const dispatch = createEventDispatcher();

	// Mock data for search results
	const searchItems = [
		{
			id: 1,
			title: 'Find Employees',
			description: 'Search through employee directory',
			icon: '👥'
		},
		{ id: 2, title: 'View Reports', description: 'Access analytics and reports', icon: '📊' },
		{ id: 3, title: 'Calendar Events', description: 'Check upcoming meetings', icon: '📅' },
		{ id: 4, title: 'Settings', description: 'Manage your preferences', icon: '⚙️' },
		{ id: 5, title: 'Time Off Requests', description: 'Submit or review time off', icon: '🏖️' },
		{ id: 6, title: 'Performance Reviews', description: 'View performance data', icon: '⭐' }
	];

	let filteredItems = $derived(
		value
			? searchItems.filter(
					(item) =>
						item.title.toLowerCase().includes(value.toLowerCase()) ||
						item.description.toLowerCase().includes(value.toLowerCase())
				)
			: []
	);

	let highlightedIndex = $state(-1);

	function handleKeydown(e) {
		if (!filteredItems.length) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredItems.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightedIndex >= 0) {
					selectItem(filteredItems[highlightedIndex]);
				}
				break;
			case 'Escape':
				value = '';
				highlightedIndex = -1;
				break;
		}
	}

	function selectItem(item) {
		value = item.title;
		highlightedIndex = -1;
		dispatch('select', item);
		if (onValueChange) onValueChange(item.title);
	}

	function handleInput(e) {
		value = e.target.value;
		highlightedIndex = -1;
		if (onValueChange) onValueChange(value);
	}
</script>

<div class="relative">
	<Search
		class="pointer-events-none absolute top-1/2 left-5 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground"
	/>
	<input
		bind:value
		{placeholder}
		class="h-12 w-80 rounded-full text-base transition-all duration-200"
		style="
			border-radius: 9999px !important; 
			padding-left: 4.25rem !important; 
			padding-right: 3.75rem !important; 
			height: 3rem !important; 
			background: rgba(255, 255, 255, 0.2) !important; 
			backdrop-filter: blur(12px) !important; 
			border: 1px solid rgba(255, 255, 255, 0.3) !important; 
			outline: none !important; 
			box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
		"
		onfocus={(e) => {
			e.target.style.background = 'rgba(255, 255, 255, 0.9) !important';
			e.target.style.border = '1px solid rgba(255, 255, 255, 0.6) !important';
			e.target.style.boxShadow =
				'0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) !important';
		}}
		onblur={(e) => {
			e.target.style.background = 'rgba(255, 255, 255, 0.2) !important';
			e.target.style.border = '1px solid rgba(255, 255, 255, 0.3) !important';
			e.target.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25) !important';
		}}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{...restProps}
	/>

	{#if value && filteredItems.length > 0}
		<div
			class="absolute top-14 right-0 left-0 max-h-80 overflow-y-auto rounded-2xl border border-border/40 bg-background/20 p-2 shadow-xl backdrop-blur-md"
		>
			{#each filteredItems as item, index (item.id)}
				<button
					class="flex w-full items-center space-x-3 rounded-2xl px-4 py-3 text-left text-muted-foreground transition-all duration-200 hover:bg-background/30 hover:text-foreground {index ===
					highlightedIndex
						? 'bg-background/40 text-foreground'
						: ''}"
					onmouseenter={() => (highlightedIndex = index)}
					onclick={() => selectItem(item)}
				>
					<span class="text-lg">{item.icon}</span>
					<div class="flex-1">
						<div class="text-sm font-medium">{item.title}</div>
						<div class="text-xs text-muted-foreground">{item.description}</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
