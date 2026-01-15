<!-- Performance Reviews Management Page -->
<!-- T039: Fix performance management pages with standardized error handling -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { page } from '$app/stores';
	import { Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import { Button } from '$lib/components/ui/button';
	import { ReviewCreationDialog } from '$lib/components/reviews';

	import { isReviewOverdue } from '$lib/graphql/queries/performance-reviews';

	// Import new decomposed components
	import ReviewStats from './components/ReviewStats.svelte';
	import ReviewAnalytics from './components/ReviewAnalytics.svelte';
	import ReviewFilters from './components/ReviewFilters.svelte';
	import ReviewList from './components/ReviewList.svelte';
	import ReviewDetailsModal from './components/ReviewDetailsModal.svelte';
	import EmployeeSelectorModal from './components/EmployeeSelectorModal.svelte';

	// Page data from server
	interface Props {
		data: {
			user: any;
			userSession: any;
			performanceReviews: any[];
			totalReviews: number;
			employees: any[];
			reviewAnalytics: any;
			filters: any;
			permissions: string[];
			canCreateReviews: boolean;
			canEditReviews: boolean;
			canViewAllReviews: boolean;
			loadedAt: string;
		};
	}

	const { data }: Props = $props();

	// Derived state using Svelte 5 runes
	const performanceReviews = $derived(data.performanceReviews);
	const reviewAnalytics = $derived(data.reviewAnalytics);
	const canCreateReviews = $derived(data.canCreateReviews);
	const canEditReviews = $derived(data.canEditReviews);

	// Debug logging
	$effect(() => {
		logger.info('🔍 [Management Reviews Component] Data received:', {
			performanceReviewsCount: performanceReviews?.length || 0,
			firstReview: performanceReviews?.[0] || null,
			selectedView,
			searchQuery
		});
	});

	// Local state for UI
	let selectedView = $state('all');
	let showDetailsModal = $state(false);
	let showEditModal = $state(false);
	let currentReview = $state<any>(null);
	let searchQuery = $state(data.filters.searchTerm || '');
	let statusFilter = $state<string | undefined>(data.filters.statusFilter || undefined);
	let periodFilter = $state<string | undefined>(data.filters.periodFilter || undefined);

	// Employee selector state
	let showEmployeeSelector = $state(false);
	let selectedEmployee = $state<any>(null);
	let employeeSearchQuery = $state('');
	let createDialogOpen = $state(false);

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

	// Filter and display logic
	const filteredReviews = $derived.by(() => {
		let filtered = performanceReviews;

		if (selectedView !== 'all') {
			filtered = filtered.filter((review) => {
				switch (selectedView) {
					case 'pending':
						return review.status === 'draft' || review.status === 'in_progress';
					case 'completed':
						return review.status === 'completed';
					case 'overdue':
						return isReviewOverdue(review);
					default:
						return true;
				}
			});
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(review) =>
					review.employee?.displayName.toLowerCase().includes(query) ||
					review.reviewer?.displayName.toLowerCase().includes(query) ||
					review.employee?.department?.name.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	// Handler functions
	function handleViewReview(review: any) {
		currentReview = review;
		showDetailsModal = true;
	}

	function handleEditReview(review: any) {
		currentReview = review;
		showEditModal = true;
	}

	async function handleDeleteReview(review: any) {
		if (!confirm('Are you sure you want to delete this performance review?')) return;

		try {
			// TODO: Implement GraphQL mutation for deleting performance review
			// For now, just show a placeholder message
			logger.info('Delete review', { reviewId: review.id });
			toast.success('Review deletion coming soon');
		} catch (error) {
			logger.error(
				'Failed to delete performance review',
				error instanceof Error ? error : new Error(String(error)),
				{ reviewId: review.id }
			);
			toast.error('Failed to delete performance review');
		}
	}

	// Navigation handlers for filtering
	function handleSearch(query: string) {
		const url = new URL($page.url);
		if (query) {
			url.searchParams.set('search', query);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1'); // Reset to first page
		goto(url.toString());
	}

	function handleStatusFilterChange(status: string | undefined) {
		statusFilter = status;
		const url = new URL($page.url);
		if (status) {
			url.searchParams.set('status', status);
		} else {
			url.searchParams.delete('status');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handlePeriodFilterChange(period: string | undefined) {
		periodFilter = period;
		const url = new URL($page.url);
		if (period) {
			url.searchParams.set('period', period);
		} else {
			url.searchParams.delete('period');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	// Open create dialog (not used directly in template but kept for logic)
	// Actually, the + button onclick uses goto, but if we wanted modal:
	/*
	function openCreateDialog() {
		if (selectedEmployee) {
			createDialogOpen = true;
		} else {
			showEmployeeSelector = true;
		}
	}
	*/

	function handleEmployeeSelected(employee: any) {
		selectedEmployee = employee;
		showEmployeeSelector = false;
		createDialogOpen = true;
	}

	// Handle create review
	function handleCreateReview(event: CustomEvent) {
		const { data: reviewData } = event.detail;
		// TODO: Call GraphQL mutation
		logger.info('Create review', { reviewData });
		toast.success('Review creation coming soon');
	}

	function handleSaveAsDraft(event: CustomEvent) {
		const { data: draftData } = event.detail;
		// TODO: Call GraphQL mutation to save draft
		logger.info('Save draft', { draftData });
		toast.success('Draft save coming soon');
	}
</script>

<svelte:head>
	<title>Performance Reviews - MountainHR</title>
	<meta
		name="description"
		content="Manage and track team performance reviews, ratings, and analytics"
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="container mx-auto space-y-6 p-4">
		<!-- Header -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Performance Reviews</h1>
				<p class="text-muted-foreground">
					Manage and track team performance reviews, ratings, and development plans
				</p>
			</div>

			{#if canCreateReviews}
				<Button onclick={() => goto('/dashboard/reviews/create')}>
					<Plus class="mr-2 h-4 w-4" />
					New Review
				</Button>
			{/if}
		</div>

		<!-- Statistics Cards -->
		<ReviewStats {reviewAnalytics} />

		<!-- Performance Analytics -->
		<ReviewAnalytics averageRatings={reviewAnalytics.averageRatings} />

		<!-- Filters -->
		<ReviewFilters
			bind:searchQuery
			bind:statusFilter
			bind:periodFilter
			onSearch={handleSearch}
			onStatusChange={handleStatusFilterChange}
			onPeriodChange={handlePeriodFilterChange}
		/>

		<!-- Reviews List with Tabs -->
		<ReviewList
			{filteredReviews}
			totalReviews={data.totalReviews}
			pendingCount={reviewAnalytics.totalReviews - reviewAnalytics.completedReviews}
			completedCount={reviewAnalytics.completedReviews}
			overdueCount={reviewAnalytics.overdueReviews}
			bind:selectedView
			{canCreateReviews}
			{canEditReviews}
			onView={handleViewReview}
			onEdit={handleEditReview}
			onDelete={handleDeleteReview}
		/>
	</div>
</div>

<!-- Review Details Modal -->
<ReviewDetailsModal
	bind:open={showDetailsModal}
	{currentReview}
	{canEditReviews}
	onClose={() => (showDetailsModal = false)}
	onEdit={handleEditReview}
/>

<!-- Employee Selector Dialog -->
<EmployeeSelectorModal
	bind:open={showEmployeeSelector}
	bind:searchQuery={employeeSearchQuery}
	{filteredEmployees}
	onSelect={handleEmployeeSelected}
	onCancel={() => (showEmployeeSelector = false)}
/>

<!-- Create Review Dialog -->
{#if selectedEmployee}
	<ReviewCreationDialog
		bind:open={createDialogOpen}
		employee={selectedEmployee}
		availableGoals={[]}
		reviewTypesMetadata={[]}
		loading={false}
		on:createReview={handleCreateReview}
		on:saveAsDraft={handleSaveAsDraft}
		on:cancel={() => (createDialogOpen = false)}
	/>
{/if}

<!-- Edit Review Dialog -->
{#if currentReview && showEditModal}
	<ReviewCreationDialog
		bind:open={showEditModal}
		employee={currentReview.employee}
		availableGoals={currentReview.goalsArray || []}
		reviewTypesMetadata={[]}
		existingDraft={currentReview}
		loading={false}
		on:createReview={handleCreateReview}
		on:saveAsDraft={handleSaveAsDraft}
		on:cancel={() => (showEditModal = false)}
	/>
{/if}
