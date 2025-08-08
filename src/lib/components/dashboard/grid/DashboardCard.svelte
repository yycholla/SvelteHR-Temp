<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { 
		MoreVertical, 
		Settings, 
		X, 
		RefreshCw, 
		AlertCircle,
		Maximize2,
		Minimize2,
		Eye,
		EyeOff
	} from 'lucide-svelte';
	import type { CardInstance, CardMetadata } from '../types.js';
	
	// Props
	export let instance: CardInstance;
	export let metadata: CardMetadata | undefined;
	export let editable = false;
	export const data: any = null; // External reference only
	export let loading = false;
	export let error: string | null = null;
	
	// Events
	const dispatch = createEventDispatcher<{
		remove: void;
		configure: Record<string, any>;
		refresh: void;
		resize: { width: number; height: number };
		visibility: boolean;
	}>();
	
	// State
	let showMenu = false;
	let isRefreshing = false;
	let cardElement: HTMLElement;
	
	// Handle refresh
	async function handleRefresh() {
		if (isRefreshing) return;
		
		isRefreshing = true;
		dispatch('refresh');
		
		// Show refresh animation for at least 500ms
		setTimeout(() => {
			isRefreshing = false;
		}, 500);
	}
	
	// Handle remove
	function handleRemove() {
		dispatch('remove');
		showMenu = false;
	}
	
	// Handle configure
	function handleConfigure() {
		dispatch('configure', instance.config || {});
		showMenu = false;
	}
	
	// Handle visibility toggle
	function handleToggleVisibility() {
		dispatch('visibility', !instance.visible);
		showMenu = false;
	}
	
	// Get icon component dynamically
	function getIconComponent(iconName?: string) {
		// This is a simplified approach - in a real app you might want a more robust icon system
		switch (iconName) {
			case 'User': return '👤';
			case 'CheckSquare': return '✅';
			case 'Calendar': return '📅';
			case 'Bell': return '🔔';
			case 'Users': return '👥';
			case 'ListTodo': return '📝';
			case 'CheckCircle': return '✔️';
			case 'TrendingUp': return '📈';
			case 'BarChart3': return '📊';
			case 'Shield': return '🛡️';
			case 'CalendarDays': return '🗓️';
			case 'MessageSquare': return '💬';
			case 'Activity': return '⚡';
			case 'Server': return '🖥️';
			case 'Users2': return '👨‍👩‍👧‍👦';
			case 'FileSearch': return '🔍';
			case 'Zap': return '⚡';
			case 'Cloud': return '☁️';
			default: return '📋';
		}
	}
	
	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (showMenu && cardElement && !cardElement.contains(event.target as Node)) {
			showMenu = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div 
	bind:this={cardElement}
	class="dashboard-card h-full w-full relative group"
	class:editing={editable}
	class:dragging={false}
>
	<Card class="h-full w-full bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl border">
		<!-- Card Header -->
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4 relative">
			<div class="flex items-center space-x-3 flex-1 min-w-0">
				{#if metadata?.icon}
					<span class="text-lg flex-shrink-0">{getIconComponent(metadata.icon)}</span>
				{/if}
				<CardTitle class="text-sm font-semibold truncate">
					{metadata?.title || 'Unknown Card'}
				</CardTitle>
			</div>
			
			<!-- Card Actions -->
			<div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
				{#if metadata?.refreshInterval !== undefined}
					<Button
						variant="ghost"
						size="sm"
						class="h-6 w-6 p-0"
						disabled={isRefreshing}
						on:click={handleRefresh}
					>
						<RefreshCw class="h-3 w-3 {isRefreshing ? 'animate-spin' : ''}" />
					</Button>
				{/if}
				
				{#if editable}
					<div class="relative">
						<Button
							variant="ghost"
							size="sm"
							class="h-6 w-6 p-0"
							on:click={() => showMenu = !showMenu}
						>
							<MoreVertical class="h-3 w-3" />
						</Button>
						
						{#if showMenu}
							<div 
								class="absolute right-0 top-8 bg-white border border-border rounded-md shadow-lg py-1 z-50 min-w-[120px]"
								transition:scale={{ duration: 150 }}
							>
								{#if metadata?.configurable}
									<button
										class="flex items-center space-x-2 px-3 py-1 text-sm hover:bg-muted w-full text-left"
										on:click={handleConfigure}
									>
										<Settings class="h-3 w-3" />
										<span>Configure</span>
									</button>
								{/if}
								
								<button
									class="flex items-center space-x-2 px-3 py-1 text-sm hover:bg-muted w-full text-left"
									on:click={handleToggleVisibility}
								>
									{#if instance.visible}
										<EyeOff class="h-3 w-3" />
										<span>Hide</span>
									{:else}
										<Eye class="h-3 w-3" />
										<span>Show</span>
									{/if}
								</button>
								
								<button
									class="flex items-center space-x-2 px-3 py-1 text-sm hover:bg-destructive hover:text-destructive-foreground w-full text-left"
									on:click={handleRemove}
								>
									<X class="h-3 w-3" />
									<span>Remove</span>
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</CardHeader>
		
		<!-- Card Content -->
		<CardContent class="flex-1 px-4 pb-4 pt-0 overflow-hidden">
			{#if error}
				<!-- Error State -->
				<div class="flex items-center justify-center h-full text-center">
					<div class="space-y-2">
						<AlertCircle class="h-8 w-8 text-destructive mx-auto" />
						<p class="text-sm font-medium text-destructive">Error loading card</p>
						<p class="text-xs text-muted-foreground">{error}</p>
						<Button variant="outline" size="sm" on:click={handleRefresh}>
							Try Again
						</Button>
					</div>
				</div>
			{:else if loading}
				<!-- Loading State -->
				<div class="flex items-center justify-center h-full">
					<div class="space-y-2 text-center">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
						<p class="text-sm text-muted-foreground">Loading...</p>
					</div>
				</div>
			{:else if !metadata}
				<!-- Unknown Card State -->
				<div class="flex items-center justify-center h-full text-center">
					<div class="space-y-2">
						<AlertCircle class="h-8 w-8 text-muted-foreground mx-auto" />
						<p class="text-sm font-medium text-muted-foreground">Unknown card type</p>
						<p class="text-xs text-muted-foreground">Card ID: {instance.cardId}</p>
					</div>
				</div>
			{:else}
				<!-- Dynamic Card Content -->
				<div class="h-full w-full overflow-hidden">
					{#await import(`../cards/${metadata.component}.svelte`)}
						<div class="flex items-center justify-center h-full">
							<div class="animate-pulse text-muted-foreground">Loading...</div>
						</div>
					{:then cardComponent}
						<svelte:component this={cardComponent.default} {instance} {metadata} {data} />
					{:catch}
						<!-- Fallback content for cards without components -->
						<div class="space-y-4">
							<div class="text-center text-muted-foreground text-sm pt-4">
								<div class="text-4xl opacity-30 mb-2">🔧</div>
								<p>Card implementation coming soon</p>
							</div>
							
							<!-- Debug info in development -->
							{#if import.meta.env.DEV}
								<div class="mt-4 pt-2 border-t border-border">
									<details class="text-xs text-muted-foreground">
										<summary>Debug Info</summary>
										<pre class="mt-2 overflow-auto text-xs">{JSON.stringify({ instance, metadata }, null, 2)}</pre>
									</details>
								</div>
							{/if}
						</div>
					{/await}
				</div>
			{/if}
		</CardContent>
	</Card>
	
	<!-- Resize handles for editing mode -->
	{#if editable && metadata?.allowResize}
		<div class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
			<svg class="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
				<path d="M20 20L20 14L18 14L18 18L14 18L14 20L20 20ZM20 8L18 8L18 4L14 4L14 2L20 2L20 8Z"/>
			</svg>
		</div>
	{/if}
</div>

<style>
	.dashboard-card.editing {
		cursor: move;
	}
	
	.dashboard-card.dragging {
		opacity: 0.8;
		transform: rotate(2deg);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	}
	
	/* Custom scrollbar for card content */
	.dashboard-card :global(.overflow-auto) {
		scrollbar-width: thin;
		scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
	}
	
	.dashboard-card :global(.overflow-auto::-webkit-scrollbar) {
		width: 4px;
		height: 4px;
	}
	
	.dashboard-card :global(.overflow-auto::-webkit-scrollbar-track) {
		background: transparent;
	}
	
	.dashboard-card :global(.overflow-auto::-webkit-scrollbar-thumb) {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 2px;
	}
	
	.dashboard-card :global(.overflow-auto::-webkit-scrollbar-thumb:hover) {
		background-color: rgba(0, 0, 0, 0.3);
	}
</style>