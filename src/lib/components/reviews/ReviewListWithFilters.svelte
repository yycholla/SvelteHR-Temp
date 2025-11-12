<script lang="ts">
	/**
	 * ReviewListWithFilters Component
	 * Feature: 023-reviews-creation-it
	 * Task: T032
	 *
	 * Filterable list of performance reviews with sorting and search
	 */
	import { createEventDispatcher } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Search,
		Filter,
		Eye,
		Edit,
		Calendar,
		User,
		FileText,
		ChevronDown,
		ChevronUp,
		SortAsc,
		SortDesc
	} from '@lucide/svelte';
	import {
		getReviewTypeInfo,
		getReviewStatusInfo,
		formatReviewPeriod,
		reviewTypesForFilter as reviewTypes,
		reviewStatuses
	} from '$lib/graphql/reviews-operations';
	import type { ReviewType, ReviewStatus } from '$lib/schemas/reviews';
	import DraftReviewIndicator from './DraftReviewIndicator.svelte';

	const dispatch = createEventDispatcher();

	// Props
	let {
		reviews = [],
		loading = false,
		showFilters = true,
		showEmployeeColumn = true,
		showReviewerColumn = true,
		emptyMessage = 'No reviews found'
	}: {
		reviews?: any[];
		loading?: boolean;
		showFilters?: boolean;
		showEmployeeColumn?: boolean;
		showReviewerColumn?: boolean;
		emptyMessage?: string;
	} = $props();

	// Filter state
	let searchQuery = $state('');
	let selectedTypes = $state<ReviewType[]>([]);
	let selectedStatuses = $state<ReviewStatus[]>([]);
	let sortBy = $state<'created' | 'updated' | 'period'>('created');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let showFiltersPanel = $state(false);

	// Debug logging
	$effect(() => {
		console.log('🔍 ReviewListWithFilters - Input reviews:', {
			reviewsCount: reviews.length,
			firstReview: reviews[0] || null,
			searchQuery,
			selectedTypes,
			selectedStatuses
		});
	});

	// Filtered and sorted reviews
	const filteredReviews = $derived.by(() => {
		let filtered = reviews;

		console.log('🔍 Starting filter - reviews:', filtered.length);

		// Apply search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(review) =>
					review.employee?.displayName?.toLowerCase().includes(query) ||
					review.employee?.email?.toLowerCase().includes(query) ||
					review.reviewer?.displayName?.toLowerCase().includes(query) ||
					review.notes?.toLowerCase().includes(query)
			);
		}

		// Apply type filters
		if (selectedTypes.length > 0) {
			console.log('🔍 Type filter - before:', filtered.length, 'selectedTypes:', selectedTypes);
			filtered = filtered.filter((review) => selectedTypes.includes(review.reviewType));
			console.log('🔍 Type filter - after:', filtered.length);
		}

		// Apply status filters
		if (selectedStatuses.length > 0) {
			console.log('🔍 Status filter - before:', filtered.length, 'selectedStatuses:', selectedStatuses);
			filtered = filtered.filter((review) => selectedStatuses.includes(review.status));
			console.log('🔍 Status filter - after:', filtered.length);
		}

		// Apply sorting
		filtered = [...filtered].sort((a, b) => {
			let comparison = 0;

			if (sortBy === 'created') {
				comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			} else if (sortBy === 'updated') {
				comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
			} else if (sortBy === 'period') {
				const aDate = a.reviewPeriodStart || a.createdAt;
				const bDate = b.reviewPeriodStart || b.createdAt;
				comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
			}

			return sortOrder === 'asc' ? comparison : -comparison;
		});

		console.log('🔍 Final filtered result:', {
			filteredCount: filtered.length,
			firstFiltered: filtered[0] || null
		});

		return filtered;
	});

	// Toggle type filter
	function toggleTypeFilter(type: ReviewType) {
		if (selectedTypes.includes(type)) {
			selectedTypes = selectedTypes.filter((t) => t !== type);
		} else {
			selectedTypes = [...selectedTypes, type];
		}
	}

	// Toggle status filter
	function toggleStatusFilter(status: ReviewStatus) {
		if (selectedStatuses.includes(status)) {
			selectedStatuses = selectedStatuses.filter((s) => s !== status);
		} else {
			selectedStatuses = [...selectedStatuses, status];
		}
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedTypes = [];
		selectedStatuses = [];
		sortBy = 'created';
		sortOrder = 'desc';
	}

	// Toggle sort order
	function toggleSortOrder() {
		sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
	}

	// Handle review actions
	function handleView(review: any) {
		dispatch('view', { review });
	}

	function handleEdit(review: any) {
		dispatch('edit', { review });
	}

	function handleResumeDraft(event: CustomEvent) {
		dispatch('resumeDraft', event.detail);
	}

	function handleDeleteDraft(event: CustomEvent) {
		dispatch('deleteDraft', event.detail);
	}

	// Active filters count
	const activeFiltersCount = $derived(
		selectedTypes.length + selectedStatuses.length + (searchQuery ? 1 : 0)
	);
</script>

<div class="review-list-with-filters space-y-4">
	<!-- Filters Bar -->
	{#if showFilters}
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center gap-4">
					<!-- Search -->
					<div class="relative flex-1">
						<Search class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							bind:value={searchQuery}
							placeholder="Search reviews by employee, reviewer, or notes..."
							class="pl-10"
							disabled={loading}
						/>
					</div>

					<!-- Filters Toggle -->
					<Button
						variant="outline"
						size="default"
						onclick={() => (showFiltersPanel = !showFiltersPanel)}
					>
						<Filter class="mr-2 h-4 w-4" />
						Filters
						{#if activeFiltersCount > 0}
							<Badge variant="default" class="ml-2 h-5 min-w-5 px-1.5">
								{activeFiltersCount}
							</Badge>
						{/if}
						{#if showFiltersPanel}
							<ChevronUp class="ml-2 h-4 w-4" />
						{:else}
							<ChevronDown class="ml-2 h-4 w-4" />
						{/if}
					</Button>

					<!-- Sort Order -->
					<Button variant="outline" size="default" onclick={toggleSortOrder}>
						{#if sortOrder === 'asc'}
							<SortAsc class="mr-2 h-4 w-4" />
						{:else}
							<SortDesc class="mr-2 h-4 w-4" />
						{/if}
						Sort
					</Button>
				</div>

				{#if showFiltersPanel}
					<Separator class="my-4" />

					<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
						<!-- Review Type Filters -->
						<div>
							<h4 class="mb-3 text-sm font-medium">Review Type</h4>
							<div class="max-h-48 space-y-2 overflow-y-auto">
								{#each reviewTypes as type (type.value)}
									<div class="flex items-center gap-2">
										<Checkbox
											checked={selectedTypes.includes(type.value as ReviewType)}
											onCheckedChange={() => toggleTypeFilter(type.value as ReviewType)}
											disabled={loading}
										/>
										<span class="cursor-pointer text-sm">
											<span class="mr-1">{type.icon}</span>
											{type.label}
										</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Status Filters -->
						<div>
							<h4 class="mb-3 text-sm font-medium">Status</h4>
							<div class="space-y-2">
								{#each reviewStatuses as status (status.value)}
									<div class="flex items-center gap-2">
										<Checkbox
											checked={selectedStatuses.includes(status.value as ReviewStatus)}
											onCheckedChange={() => toggleStatusFilter(status.value as ReviewStatus)}
											disabled={loading}
										/>
										<span class="cursor-pointer text-sm">
											<span class="mr-1">{status.icon}</span>
											{status.label}
										</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Sort By -->
						<div>
							<h4 class="mb-3 text-sm font-medium">Sort By</h4>
							<div class="space-y-2">
								{#each [{ value: 'created', label: 'Created Date' }, { value: 'updated', label: 'Last Updated' }, { value: 'period', label: 'Review Period' }] as option}
									<div class="flex items-center gap-2">
										<Checkbox
											checked={sortBy === option.value}
											onCheckedChange={() => (sortBy = option.value as typeof sortBy)}
											disabled={loading}
										/>
										<span class="cursor-pointer text-sm">{option.label}</span>
									</div>
								{/each}
							</div>

							{#if activeFiltersCount > 0}
								<Button
									variant="ghost"
									size="sm"
									onclick={clearFilters}
									class="mt-4 w-full"
									disabled={loading}
								>
									Clear All Filters
								</Button>
							{/if}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Results Count -->
	<div class="text-sm text-muted-foreground">
		Showing {filteredReviews().length} of {reviews.length} reviews
	</div>

	<!-- Reviews List -->
	{#if loading}
		<div class="space-y-4">
			{#each Array(3) as _}
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="animate-pulse space-y-3">
							<div class="h-4 w-3/4 rounded bg-accent"></div>
							<div class="h-4 w-1/2 rounded bg-accent"></div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else if filteredReviews().length === 0}
		<Card.Root>
			<Card.Content class="pt-12 pb-12 text-center">
				<FileText class="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-20" />
				<p class="text-muted-foreground">{emptyMessage}</p>
				{#if activeFiltersCount > 0}
					<Button variant="link" onclick={clearFilters} class="mt-2">
						Clear filters to see all reviews
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each filteredReviews() as review (review.id)}
				{#if review.status === 'DRAFT'}
					<DraftReviewIndicator
						draft={review}
						variant="card"
						on:resume={handleResumeDraft}
						on:delete={handleDeleteDraft}
					/>
				{:else}
					<Card.Root class="transition-colors hover:bg-accent/50">
						<Card.Content class="pt-6">
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-3">
									<!-- Review Type and Status -->
									<div class="flex items-center gap-2">
										<span class="text-2xl">
											{getReviewTypeInfo(review.reviewType).icon}
										</span>
										<h3 class="font-medium">
											{getReviewTypeInfo(review.reviewType).label}
										</h3>
										<Badge
											variant={review.status === 'COMPLETED' ? 'default' : 'secondary'}
											class="ml-auto"
										>
											{getReviewStatusInfo(review.status).icon}
											{getReviewStatusInfo(review.status).label}
										</Badge>
									</div>

									<!-- Employee and Reviewer Info -->
									<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
										{#if showEmployeeColumn && review.employee}
											<div class="flex items-center gap-2 text-muted-foreground">
												<User class="h-4 w-4" />
												<span>Employee: {review.employee.displayName}</span>
											</div>
										{/if}

										{#if showReviewerColumn && review.reviewer}
											<div class="flex items-center gap-2 text-muted-foreground">
												<User class="h-4 w-4" />
												<span>Reviewer: {review.reviewer.displayName}</span>
											</div>
										{/if}
									</div>

									<!-- Period and Dates -->
									<div class="flex items-center gap-4 text-sm text-muted-foreground">
										{#if review.reviewPeriodStart || review.reviewPeriodEnd}
											<div class="flex items-center gap-2">
												<Calendar class="h-4 w-4" />
												<span>
													Period: {formatReviewPeriod(
														review.reviewPeriodStart,
														review.reviewPeriodEnd
													)}
												</span>
											</div>
										{/if}
										<div class="flex items-center gap-2">
											<span>
												Created: {new Date(review.createdAt).toLocaleDateString()}
											</span>
										</div>
									</div>

									<!-- Notes Preview -->
									{#if review.notes}
										<p class="line-clamp-2 text-sm text-muted-foreground">
											{review.notes}
										</p>
									{/if}
								</div>

								<!-- Actions -->
								<div class="ml-4 flex items-center gap-2">
									<Button variant="outline" size="sm" onclick={() => handleView(review)}>
										<Eye class="mr-2 h-4 w-4" />
										View
									</Button>
									{#if review.status === 'DRAFT'}
										<Button variant="default" size="sm" onclick={() => handleEdit(review)}>
											<Edit class="mr-2 h-4 w-4" />
											Edit
										</Button>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.review-list-with-filters {
		width: 100%;
	}
</style>
