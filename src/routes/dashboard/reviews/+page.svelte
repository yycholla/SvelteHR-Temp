<script lang="ts">
	/**
	import { logger } from '$lib/utils/logger';
	 * Performance Reviews Management Page
	 * Feature: 023-reviews-creation-it
	 * Task: T034
	 *
	 * Main reviews listing page with filters and creation dialog
	 */
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { CheckCircle, Clock, FileText, Plus, Search, TrendingUp, User } from '@lucide/svelte';
	import { ReviewCreationDialog, ReviewListWithFilters } from '$lib/components/reviews';

	const { data }: { data: PageData } = $props();

	// Debug logging
	$effect(() => {
		logger.info('📊 Client-side data:', {
			reviewsCount: data.reviews?.length || 0,
			firstReview: data.reviews?.[0] || null,
			stats: data.stats
		});
	});

	// Dialog state
	let createDialogOpen = $state(false);
	let selectedEmployee = $state<any>(data.selectedEmployee || null);
	let showEmployeeSelector = $state(false);
	let employeeSearchQuery = $state('');

	// Auto-open dialog if employee was selected via URL parameter
	$effect(() => {
		if (data.selectedEmployee) {
			selectedEmployee = data.selectedEmployee;
			createDialogOpen = true;
		}
	});

	// Filtered employees for selector
	const filteredEmployees = $derived.by(() => {
		if (!employeeSearchQuery) return data.employees || [];

		const query = employeeSearchQuery.toLowerCase();
		return (data.employees || []).filter(
			(emp: any) =>
				emp.displayName?.toLowerCase().includes(query) ||
				emp.email?.toLowerCase().includes(query) ||
				emp.firstName?.toLowerCase().includes(query) ||
				emp.lastName?.toLowerCase().includes(query)
		);
	});

	// Handle review actions
	function handleViewReview(event: CustomEvent) {
		const { review } = event.detail;
		goto(`/dashboard/reviews/${review.id}`);
	}

	function handleEditReview(event: CustomEvent) {
		const { review } = event.detail;
		goto(`/dashboard/reviews/${review.id}`);
	}

	function handleResumeDraft(event: CustomEvent) {
		const { draft } = event.detail;
		// TODO: Open dialog with draft data
		goto(`/dashboard/reviews/${draft.id}`);
	}

	function handleDeleteDraft(event: CustomEvent) {
		const { draft } = event.detail;
		// TODO: Implement draft deletion with confirmation
		logger.info('Delete draft:', draft.id);
	}

	// Handle create review
	function handleCreateReview(event: CustomEvent) {
		const { data: reviewData } = event.detail;
		// TODO: Call GraphQL mutation
		logger.info('Create review:'.replace(/['`]$/, `: ${reviewData}'`/));
	}

	function handleSaveAsDraft(event: CustomEvent) {
		const { data: draftData } = event.detail;
		// TODO: Call GraphQL mutation to save draft
		logger.info('Save draft:'.replace(/['`]$/, `: ${draftData}'`/));
	}

	// Open create dialog
	function openCreateDialog() {
		if (selectedEmployee) {
			// If we already have a selected employee, open review dialog
			createDialogOpen = true;
		} else {
			// Show employee selector first
			showEmployeeSelector = true;
		}
	}

	function handleEmployeeSelected(employee: any) {
		selectedEmployee = employee;
		showEmployeeSelector = false;
		createDialogOpen = true;
	}
</script>

<div class="reviews-page space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Performance Reviews</h1>
			<p class="text-muted-foreground mt-1">Manage and track employee performance reviews</p>
		</div>

		{#if data.permissions.canCreate}
			<Button onclick={() => goto('/dashboard/reviews/create')} size="default">
				<Plus class="w-4 h-4 mr-2" />
				Create Review
			</Button>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Reviews</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.total}</div>
				<p class="text-xs text-muted-foreground mt-1">All time</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Drafts</Card.Title>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.draft}</div>
				<p class="text-xs text-muted-foreground mt-1">Pending completion</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">In Progress</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.inProgress}</div>
				<p class="text-xs text-muted-foreground mt-1">Active reviews</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Completed</Card.Title>
				<CheckCircle class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.completed}</div>
				<p class="text-xs text-muted-foreground mt-1">
					{data.stats.total > 0 ? Math.round((data.stats.completed / data.stats.total) * 100) : 0}%
					completion rate
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Error Display -->
	{#if data.error}
		<Card.Root class="border-destructive">
			<Card.Content class="pt-6">
				<p class="text-destructive">{data.error}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Reviews List with Filters -->
	<ReviewListWithFilters
		reviews={data.reviews}
		loading={false}
		showEmployeeColumn={data.permissions.canViewAll}
		showReviewerColumn={data.permissions.canViewAll}
		on:view={handleViewReview}
		on:edit={handleEditReview}
		on:resumeDraft={handleResumeDraft}
		on:deleteDraft={handleDeleteDraft}
	/>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!data.pagination.hasPreviousPage}
					onclick={() => {
						const url = new URL($page.url);
						url.searchParams.set('page', String(data.pagination.page - 1));
						goto(url.toString());
					}}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={!data.pagination.hasNextPage}
					onclick={() => {
						const url = new URL($page.url);
						url.searchParams.set('page', String(data.pagination.page + 1));
						goto(url.toString());
					}}
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
</div>

<!-- Create Review Dialog -->
{#if selectedEmployee}
	<ReviewCreationDialog
		bind:open={createDialogOpen}
		employee={selectedEmployee}
		availableGoals={[]}
		reviewTypesMetadata={data.reviewTypesMetadata as any}
		loading={false}
		on:createReview={handleCreateReview}
		on:saveAsDraft={handleSaveAsDraft}
		on:cancel={() => (createDialogOpen = false)}
	/>
{/if}

<!-- Employee Selector Dialog -->
<Dialog.Root bind:open={showEmployeeSelector}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-2xl max-h-[80vh]">
			<Dialog.Header>
				<Dialog.Title>Select Employee for Review</Dialog.Title>
				<Dialog.Description>
					Choose an employee to create a performance review for
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Search Input -->
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search employees by name or email..."
						bind:value={employeeSearchQuery}
						class="pl-9"
					/>
				</div>

				<!-- Employee List -->
				<div class="border rounded-md max-h-96 overflow-y-auto">
					{#if filteredEmployees.length === 0}
						<div class="p-8 text-center text-muted-foreground">
							<User class="h-12 w-12 mx-auto mb-2 opacity-50" />
							<p>No employees found</p>
							{#if employeeSearchQuery}
								<p class="text-sm mt-1">Try adjusting your search</p>
							{/if}
						</div>
					{:else}
						<div class="divide-y">
							{#each filteredEmployees as employee (employee.id)}
								<button
									type="button"
									class="w-full p-4 text-left hover:bg-accent transition-colors flex items-center gap-3"
									onclick={() => handleEmployeeSelected(employee)}
								>
									<div class="flex-1">
										<div class="font-medium">{employee.displayName}</div>
										<div class="text-sm text-muted-foreground">{employee.email}</div>
									</div>
									<Badge variant="outline">
										{employee.firstName}
										{employee.lastName}
									</Badge>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showEmployeeSelector = false)}>Cancel</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.reviews-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	@media (max-width: 768px) {
		.reviews-page {
			padding: 1rem;
		}
	}
</style>
