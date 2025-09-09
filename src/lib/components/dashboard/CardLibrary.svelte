<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Search, Plus, Filter, X, Tag } from 'lucide-svelte';
	import type { CardMetadata, CardTag, CardInstance } from './types.js';

	// Props - Enhanced for new dashboard system
	interface Props {
		availableCards: CardMetadata[];
		existingCards: CardInstance[];
		onAddCard: (cardId: string) => void;
		onClose: () => void;
		className?: string;
	}
	
	let { 
		availableCards, 
		existingCards, 
		onAddCard, 
		onClose, 
		className = '' 
	}: Props = $props();

	// Legacy props support
	export let open = true;

	// Events
	const dispatch = createEventDispatcher<{
		close: void;
		addCard: { cardId: string };
	}>();

	// State
	let searchQuery = '';
	let selectedTags: CardTag[] = [];
	let viewMode: 'grid' | 'list' = 'grid';

	// Get all available tags
	$: allTags = Array.from(new Set(availableCards.flatMap((card) => card.tags))).sort();

	// Get already added card IDs
	$: addedCardIds = new Set(existingCards.map((c) => c.cardId) || []);

	// Filter cards based on search and tags
	$: filteredCards = availableCards.filter((card) => {
		// Search filter
		const matchesSearch =
			!searchQuery ||
			card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			card.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

		// Tag filter
		const matchesTags =
			selectedTags.length === 0 || selectedTags.some((tag) => card.tags.includes(tag));

		return matchesSearch && matchesTags;
	});

	// Group cards by category for better organization
	$: cardsByCategory = filteredCards.reduce(
		(acc, card) => {
			const primaryTag = card.tags[0] || 'other';
			if (!acc[primaryTag]) acc[primaryTag] = [];
			acc[primaryTag].push(card);
			return acc;
		},
		{} as Record<string, CardMetadata[]>
	);

	// Handle tag selection
	function toggleTag(tag: CardTag) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedTags = [];
	}

	// Handle add card - Enhanced with callback support
	function handleAddCard(cardId: string) {
		console.log('📚 CardLibrary handleAddCard called with:', cardId);
		
		if (onAddCard) {
			onAddCard(cardId);
		} else {
			dispatch('addCard', { cardId });
		}
		
		console.log('📤 Card add event processed');
	}

	// Close library - Enhanced with callback support
	function handleClose() {
		if (onClose) {
			onClose();
		} else {
			dispatch('close');
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// Get icon representation
	function getIconComponent(iconName?: string) {
		switch (iconName) {
			case 'User':
				return '👤';
			case 'CheckSquare':
				return '✅';
			case 'Calendar':
				return '📅';
			case 'Bell':
				return '🔔';
			case 'Users':
				return '👥';
			case 'ListTodo':
				return '📝';
			case 'CheckCircle':
				return '✔️';
			case 'TrendingUp':
				return '📈';
			case 'BarChart3':
				return '📊';
			case 'Shield':
				return '🛡️';
			case 'CalendarDays':
				return '🗓️';
			case 'MessageSquare':
				return '💬';
			case 'Activity':
				return '⚡';
			case 'Server':
				return '🖥️';
			case 'Users2':
				return '👨‍👩‍👧‍👦';
			case 'FileSearch':
				return '🔍';
			case 'Zap':
				return '⚡';
			case 'Cloud':
				return '☁️';
			default:
				return '📋';
		}
	}

	// Get category display name
	function getCategoryDisplayName(category: string): string {
		const categoryNames: Record<string, string> = {
			personal: 'Personal',
			team: 'Team Management',
			hr: 'Human Resources',
			admin: 'Administration',
			metrics: 'Metrics & Analytics',
			system: 'System',
			compliance: 'Compliance',
			tasks: 'Task Management',
			leave: 'Leave Management',
			performance: 'Performance',
			notifications: 'Notifications',
			reports: 'Reports',
			finance: 'Finance',
			other: 'Other'
		};
		return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="card-library-title"
	>
		<!-- Library Panel -->
		<div
			class="fixed top-0 right-0 h-full w-full max-w-4xl bg-background shadow-2xl"
			transition:scale={{ duration: 300, start: 0.95 }}
		>
			<div class="flex h-full flex-col">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-border p-6">
					<div>
						<h2 id="card-library-title" class="text-2xl font-bold">Card Library</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Add widgets to customize your dashboard
						</p>
					</div>
					<Button variant="ghost" size="sm" on:click={handleClose}>
						<X class="h-4 w-4" />
					</Button>
				</div>

				<!-- Filters -->
				<div class="space-y-4 border-b border-border p-6">
					<!-- Search -->
					<div class="relative">
						<Search class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<Input bind:value={searchQuery} placeholder="Search cards..." class="pl-10" />
					</div>

					<!-- Tags -->
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<label class="text-sm font-medium">Filter by category:</label>
							{#if selectedTags.length > 0 || searchQuery}
								<Button variant="ghost" size="sm" on:click={clearFilters}>Clear filters</Button>
							{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							{#each allTags as tag}
								<button
									class="inline-flex items-center space-x-1 rounded-md border px-2 py-1 text-xs transition-colors
										{selectedTags.includes(tag)
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-border bg-background text-muted-foreground hover:bg-muted'}"
									on:click={() => toggleTag(tag)}
								>
									<Tag class="h-3 w-3" />
									<span>#{tag}</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Results count -->
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>
							{filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''} available
						</span>
						<div class="flex items-center space-x-2">
							<span>View:</span>
							<Button
								variant={viewMode === 'grid' ? 'default' : 'ghost'}
								size="sm"
								on:click={() => (viewMode = 'grid')}
							>
								Grid
							</Button>
							<Button
								variant={viewMode === 'list' ? 'default' : 'ghost'}
								size="sm"
								on:click={() => (viewMode = 'list')}
							>
								List
							</Button>
						</div>
					</div>
				</div>

				<!-- Cards List -->
				<div class="flex-1 overflow-auto p-6">
					{#if filteredCards.length === 0}
						<div class="flex h-full items-center justify-center text-center">
							<div class="space-y-3">
								<div class="text-4xl opacity-50">🔍</div>
								<h3 class="font-semibold text-muted-foreground">No cards found</h3>
								<p class="text-sm text-muted-foreground">
									Try adjusting your search or filter criteria
								</p>
							</div>
						</div>
					{:else}
						<div class="space-y-8">
							{#each Object.entries(cardsByCategory) as [category, cards]}
								<div class="space-y-4">
									<h3
										class="sticky top-0 bg-background/95 py-2 text-lg font-semibold backdrop-blur-sm"
									>
										{getCategoryDisplayName(category)}
										<Badge variant="secondary" class="ml-2 text-xs">
											{cards.length}
										</Badge>
									</h3>

									{#if viewMode === 'grid'}
										<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
											{#each cards as card}
												<Card class="h-full transition-all duration-200 hover:shadow-lg">
													<CardHeader class="pb-3">
														<div class="flex items-start justify-between">
															<div class="flex min-w-0 flex-1 items-center space-x-2">
																{#if card.icon}
																	<span class="flex-shrink-0 text-lg"
																		>{getIconComponent(card.icon)}</span
																	>
																{/if}
																<CardTitle class="truncate text-sm">{card.title}</CardTitle>
															</div>
															<Button
																variant={addedCardIds.has(card.id) ? 'secondary' : 'default'}
																size="sm"
																disabled={addedCardIds.has(card.id)}
																on:click={() => handleAddCard(card.id)}
															>
																{#if addedCardIds.has(card.id)}
																	Added
																{:else}
																	<Plus class="mr-1 h-3 w-3" />
																	Add
																{/if}
															</Button>
														</div>
													</CardHeader>
													<CardContent class="space-y-3 pt-0">
														<p class="text-xs text-muted-foreground">
															{card.description}
														</p>

														<div class="flex flex-wrap gap-1">
															{#each card.tags as tag}
																<Badge variant="outline" class="text-xs">#{tag}</Badge>
															{/each}
														</div>

														<div
															class="flex items-center justify-between text-xs text-muted-foreground"
														>
															<span>Size: {card.defaultSize}</span>
															{#if card.refreshInterval}
																<span>Auto-refresh: {Math.floor(card.refreshInterval / 60)}m</span>
															{/if}
														</div>
													</CardContent>
												</Card>
											{/each}
										</div>
									{:else}
										<div class="space-y-2">
											{#each cards as card}
												<div
													class="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
												>
													<div class="flex min-w-0 flex-1 items-center space-x-3">
														{#if card.icon}
															<span class="flex-shrink-0 text-lg"
																>{getIconComponent(card.icon)}</span
															>
														{/if}
														<div class="min-w-0 flex-1">
															<h4 class="truncate font-medium">{card.title}</h4>
															<p class="truncate text-sm text-muted-foreground">
																{card.description}
															</p>
															<div class="mt-1 flex items-center space-x-2">
																<div class="flex flex-wrap gap-1">
																	{#each card.tags.slice(0, 3) as tag}
																		<Badge variant="outline" class="text-xs">#{tag}</Badge>
																	{/each}
																	{#if card.tags.length > 3}
																		<Badge variant="outline" class="text-xs">
																			+{card.tags.length - 3}
																		</Badge>
																	{/if}
																</div>
															</div>
														</div>
													</div>
													<Button
														variant={addedCardIds.has(card.id) ? 'secondary' : 'default'}
														size="sm"
														disabled={addedCardIds.has(card.id)}
														on:click={() => handleAddCard(card.id)}
													>
														{#if addedCardIds.has(card.id)}
															Added
														{:else}
															<Plus class="mr-1 h-3 w-3" />
															Add
														{/if}
													</Button>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
