<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getOperationStore, queryStore } from '@urql/svelte';
	import { toast } from 'svelte-sonner';
	import { Star, Edit, Eye, Plus, Filter, X } from 'lucide-svelte';

	import HrDataTable from '$lib/components/data-table/hr-data-table.svelte';
	import DataExport from '$lib/components/export/data-export.svelte';
	import {
		GET_PERFORMANCE_REVIEWS,
		GET_PENDING_REVIEWS_FOR_MANAGER,
		CREATE_PERFORMANCE_REVIEW,
		UPDATE_PERFORMANCE_REVIEW,
		DELETE_PERFORMANCE_REVIEW,
		getRatingInfo,
		getStatusInfo,
		formatReviewPeriod,
		reviewStatusOptions,
		performanceRatings
	} from '$lib/graphql/performance-management-operations';

	// Page data from server
	export let data;

	// Local state using Svelte 5 runes
	let selectedReviews = $state<any[]>([]);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showViewModal = $state(false);
	let currentReview = $state<any>(null);
	let statusFilter = $state('all');
	let ratingFilter = $state('all');
	let periodFilter = $state('all');
	let searchQuery = $state('');

	// Pagination state
	let currentPage = $state(1);
	let pageSize = $state(20);

	// Create/Edit form state
	let formData = $state({
		employeeId: '',
		reviewerId: data.user?.id || '',
		reviewPeriodStart: '',
		reviewPeriodEnd: '',
		status: 'draft' as any,
		overallRating: 3,
		goalsAchievement: 3,
		collaboration: 3,
		communication: 3,
		leadership: 3,
		strengths: '',
		areasForImprovement: '',
		goalsForNextPeriod: '',
		developmentPlan: '',
		reviewNotes: '',
		employeeSelfAssessment: ''
	});

	// Query for performance reviews
	const performanceReviews = queryStore({
		client: getOperationStore(),
		query: GET_PERFORMANCE_REVIEWS,
		variables: {
			first: pageSize,
			offset: (currentPage - 1) * pageSize,
			filter: {
				...(statusFilter !== 'all' && { status: statusFilter }),
				...(ratingFilter !== 'all' && {
					overallRating: {
						greaterThanOrEqualTo: parseInt(ratingFilter),
						lessThanOrEqualTo: parseInt(ratingFilter)
					}
				})
			}
		}
	});

	// Mutation operations
	const createReview = getOperationStore(CREATE_PERFORMANCE_REVIEW);
	const updateReview = getOperationStore(UPDATE_PERFORMANCE_REVIEW);
	const deleteReview = getOperationStore(DELETE_PERFORMANCE_REVIEW);

	// Table columns configuration
	const columns = [
		{
			key: 'employee',
			label: 'Employee',
			sortable: true,
			render: (value: any, row: any) => {
				return `<div data-testid="employee-name">
					<div class="font-medium">${row.employee?.displayName}</div>
					<div class="text-sm text-gray-500">${row.employee?.jobTitle}</div>
				</div>`;
			}
		},
		{
			key: 'reviewPeriod',
			label: 'Review Period',
			render: (value: any, row: any) => {
				return `<div data-testid="review-period">${formatReviewPeriod(row.reviewPeriodStart, row.reviewPeriodEnd)}</div>`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (value: string) => {
				const statusInfo = getStatusInfo(value as any);
				return `<span data-testid="review-status" class="px-2 py-1 rounded-full text-xs bg-${statusInfo.color}-100 text-${statusInfo.color}-800">
					${statusInfo.icon} ${statusInfo.label}
				</span>`;
			}
		},
		{
			key: 'overallRating',
			label: 'Rating',
			sortable: true,
			align: 'center',
			render: (value: number) => {
				if (!value) return '<span class="text-gray-400">-</span>';
				const ratingInfo = getRatingInfo(value);
				return `<div data-testid="overall-rating" class="flex items-center justify-center">
					<span class="text-${ratingInfo.color}-600 font-bold">${value}/5</span>
					<span class="ml-1 text-lg">${ratingInfo.icon}</span>
				</div>`;
			}
		},
		{
			key: 'reviewer',
			label: 'Reviewer',
			render: (value: any, row: any) => {
				return `<div data-testid="reviewer-name" class="text-sm">${row.reviewer?.displayName || 'Unassigned'}</div>`;
			}
		},
		{
			key: 'actions',
			label: 'Actions',
			align: 'center',
			render: (value: any, row: any) => {
				return `
					<div class="flex gap-2 justify-center">
						<button
							data-testid="view-review"
							class="p-1 text-blue-600 hover:bg-blue-50 rounded"
							title="View Review"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
							</svg>
						</button>
						<button
							data-testid="edit-review"
							class="p-1 text-green-600 hover:bg-green-50 rounded"
							title="Edit Review"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
							</svg>
						</button>
						<button
							data-testid="delete-review"
							class="p-1 text-red-600 hover:bg-red-50 rounded"
							title="Delete Review"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
							</svg>
						</button>
					</div>
				`;
			}
		}
	];

	// Handle create review
	function handleCreateReview() {
		formData = {
			employeeId: '',
			reviewerId: data.user?.id || '',
			reviewPeriodStart: '',
			reviewPeriodEnd: '',
			status: 'draft' as any,
			overallRating: 3,
			goalsAchievement: 3,
			collaboration: 3,
			communication: 3,
			leadership: 3,
			strengths: '',
			areasForImprovement: '',
			goalsForNextPeriod: '',
			developmentPlan: '',
			reviewNotes: '',
			employeeSelfAssessment: ''
		};
		currentReview = null;
		showCreateModal = true;
	}

	// Handle edit review
	function handleEditReview(review: any) {
		formData = {
			employeeId: review.employee?.id || '',
			reviewerId: review.reviewer?.id || data.user?.id || '',
			reviewPeriodStart: review.reviewPeriodStart || '',
			reviewPeriodEnd: review.reviewPeriodEnd || '',
			status: review.status || 'draft',
			overallRating: review.overallRating || 3,
			goalsAchievement: review.goalsAchievement || 3,
			collaboration: review.collaboration || 3,
			communication: review.communication || 3,
			leadership: review.leadership || 3,
			strengths: review.strengths || '',
			areasForImprovement: review.areasForImprovement || '',
			goalsForNextPeriod: review.goalsForNextPeriod || '',
			developmentPlan: review.developmentPlan || '',
			reviewNotes: review.reviewNotes || '',
			employeeSelfAssessment: review.employeeSelfAssessment || ''
		};
		currentReview = review;
		showEditModal = true;
	}

	// Handle view review
	function handleViewReview(review: any) {
		currentReview = review;
		showViewModal = true;
	}

	// Handle delete review
	async function handleDeleteReview(review: any) {
		if (
			!confirm(`Are you sure you want to delete the review for ${review.employee?.displayName}?`)
		) {
			return;
		}

		try {
			const result = await deleteReview({
				input: {
					id: review.id
				}
			});

			if (result.data) {
				toast.success('Performance review deleted successfully');
				performanceReviews.reexecute();
			}
		} catch (error) {
			toast.error('Failed to delete performance review');
		}
	}

	// Submit form (create or update)
	async function submitForm() {
		try {
			if (currentReview) {
				// Update existing review
				const result = await updateReview({
					input: {
						id: currentReview.id,
						patch: {
							status: formData.status,
							overallRating: formData.overallRating,
							goalsAchievement: formData.goalsAchievement,
							collaboration: formData.collaboration,
							communication: formData.communication,
							leadership: formData.leadership,
							strengths: formData.strengths,
							areasForImprovement: formData.areasForImprovement,
							goalsForNextPeriod: formData.goalsForNextPeriod,
							developmentPlan: formData.developmentPlan,
							reviewNotes: formData.reviewNotes,
							employeeSelfAssessment: formData.employeeSelfAssessment
						}
					}
				});

				if (result.data) {
					toast.success('Performance review updated successfully');
					closeModals();
					performanceReviews.reexecute();
				}
			} else {
				// Create new review
				const result = await createReview({
					input: {
						performanceReview: {
							employeeId: formData.employeeId,
							reviewerId: formData.reviewerId,
							reviewPeriodStart: formData.reviewPeriodStart,
							reviewPeriodEnd: formData.reviewPeriodEnd,
							status: formData.status,
							reviewNotes: formData.reviewNotes
						}
					}
				});

				if (result.data) {
					toast.success('Performance review created successfully');
					closeModals();
					performanceReviews.reexecute();
				}
			}
		} catch (error) {
			toast.error(
				currentReview
					? 'Failed to update performance review'
					: 'Failed to create performance review'
			);
		}
	}

	// Close modals
	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showViewModal = false;
		currentReview = null;
	}

	// Apply filters
	function applyFilters() {
		currentPage = 1;
		performanceReviews.reexecute();
	}

	// Clear filters
	function clearFilters() {
		statusFilter = 'all';
		ratingFilter = 'all';
		periodFilter = 'all';
		searchQuery = '';
		applyFilters();
	}

	// Handle row click
	function handleRowClick(event: CustomEvent) {
		const row = event.detail;
		const target = event.target as HTMLElement;

		// Check which action button was clicked
		if (target.closest('[data-testid="view-review"]')) {
			handleViewReview(row);
		} else if (target.closest('[data-testid="edit-review"]')) {
			handleEditReview(row);
		} else if (target.closest('[data-testid="delete-review"]')) {
			handleDeleteReview(row);
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Page Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Performance Reviews</h1>
			<p class="mt-2 text-gray-600">Manage and track team performance reviews</p>
		</div>
		<button
			onclick={handleCreateReview}
			class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			data-testid="create-review"
		>
			<Plus class="h-4 w-4" />
			Create Review
		</button>
	</div>

	<!-- Filters Section -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<!-- Status Filter -->
			<div>
				<label for="status-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={statusFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="status-filter"
				>
					<option value="all">All Statuses</option>
					{#each reviewStatusOptions as status}
						<option value={status.value}>{status.label}</option>
					{/each}
				</select>
			</div>

			<!-- Rating Filter -->
			<div>
				<label for="rating-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Rating
				</label>
				<select
					id="rating-filter"
					bind:value={ratingFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="rating-filter"
				>
					<option value="all">All Ratings</option>
					{#each performanceRatings as rating}
						<option value={rating.value.toString()}>{rating.value} - {rating.label}</option>
					{/each}
				</select>
			</div>

			<!-- Period Filter -->
			<div>
				<label for="period-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Review Period
				</label>
				<select
					id="period-filter"
					bind:value={periodFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="period-filter"
				>
					<option value="all">All Periods</option>
					<option value="q1">Q1 (Jan-Mar)</option>
					<option value="q2">Q2 (Apr-Jun)</option>
					<option value="q3">Q3 (Jul-Sep)</option>
					<option value="q4">Q4 (Oct-Dec)</option>
					<option value="h1">H1 (Jan-Jun)</option>
					<option value="h2">H2 (Jul-Dec)</option>
					<option value="annual">Annual</option>
				</select>
			</div>

			<!-- Search -->
			<div>
				<label for="search" class="mb-1 block text-sm font-medium text-gray-700">
					Search Employee
				</label>
				<input
					id="search"
					type="text"
					bind:value={searchQuery}
					placeholder="Search by name..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="employee-search"
				/>
			</div>
		</div>

		<!-- Filter Actions -->
		<div class="mt-4 flex gap-2">
			<button
				onclick={applyFilters}
				class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				data-testid="apply-filters"
			>
				Apply Filters
			</button>
			<button
				onclick={clearFilters}
				class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
				data-testid="clear-filters"
			>
				Clear Filters
			</button>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-lg bg-white shadow">
		<HrDataTable
			data={$performanceReviews.data?.performanceReviews?.nodes || []}
			{columns}
			loading={$performanceReviews.fetching}
			searchable={false}
			selectable={true}
			onSelectionChange={(selected) => (selectedReviews = selected)}
			onRowClick={handleRowClick}
			pagination={{
				page: currentPage,
				pageSize,
				total: $performanceReviews.data?.performanceReviews?.totalCount || 0,
				pageSizes: [10, 20, 50, 100]
			}}
			onPageChange={(page) => {
				currentPage = page;
				performanceReviews.reexecute();
			}}
			onPageSizeChange={(size) => {
				pageSize = size;
				currentPage = 1;
				performanceReviews.reexecute();
			}}
			emptyMessage="No performance reviews found"
			testId="performance-reviews-table"
		/>
	</div>

	<!-- Export Component -->
	<DataExport
		data={$performanceReviews.data?.performanceReviews?.nodes || []}
		filename="performance-reviews"
		testId="export-csv"
	/>
</div>

<!-- Create Review Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="create-review-modal"
	>
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold" data-testid="modal-title">Create Performance Review</h2>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<form on:submit|preventDefault={submitForm}>
				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Employee ID *</label>
						<input
							type="text"
							bind:value={formData.employeeId}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="employee-id"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Status</label>
						<select
							bind:value={formData.status}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="review-status"
						>
							{#each reviewStatusOptions as status}
								<option value={status.value}>{status.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Period Start *</label>
						<input
							type="date"
							bind:value={formData.reviewPeriodStart}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="period-start"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Period End *</label>
						<input
							type="date"
							bind:value={formData.reviewPeriodEnd}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="period-end"
						/>
					</div>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Review Notes</label>
					<textarea
						bind:value={formData.reviewNotes}
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="review-notes"
					></textarea>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						data-testid="submit-review"
					>
						Create Review
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Review Modal -->
{#if showEditModal && currentReview}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="edit-review-modal"
	>
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold" data-testid="modal-title">
					Edit Performance Review - {currentReview.employee?.displayName}
				</h2>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<form on:submit|preventDefault={submitForm}>
				<!-- Rating Section -->
				<div class="mb-6">
					<h3 class="mb-4 text-lg font-medium">Performance Ratings</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Overall Rating</label>
							<select
								bind:value={formData.overallRating}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="overall-rating"
							>
								{#each performanceRatings as rating}
									<option value={rating.value}>{rating.value} - {rating.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Goals Achievement</label>
							<select
								bind:value={formData.goalsAchievement}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="goals-rating"
							>
								{#each performanceRatings as rating}
									<option value={rating.value}>{rating.value} - {rating.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Collaboration</label>
							<select
								bind:value={formData.collaboration}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="collaboration-rating"
							>
								{#each performanceRatings as rating}
									<option value={rating.value}>{rating.value} - {rating.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Communication</label>
							<select
								bind:value={formData.communication}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="communication-rating"
							>
								{#each performanceRatings as rating}
									<option value={rating.value}>{rating.value} - {rating.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Leadership</label>
							<select
								bind:value={formData.leadership}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="leadership-rating"
							>
								{#each performanceRatings as rating}
									<option value={rating.value}>{rating.value} - {rating.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Status</label>
							<select
								bind:value={formData.status}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="review-status"
							>
								{#each reviewStatusOptions as status}
									<option value={status.value}>{status.label}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Feedback Section -->
				<div class="mb-6">
					<h3 class="mb-4 text-lg font-medium">Review Feedback</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700">Strengths</label>
							<textarea
								bind:value={formData.strengths}
								rows="4"
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="strengths"
								placeholder="Key strengths and achievements..."
							></textarea>
						</div>
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700"
								>Areas for Improvement</label
							>
							<textarea
								bind:value={formData.areasForImprovement}
								rows="4"
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
								data-testid="improvements"
								placeholder="Areas that need development..."
							></textarea>
						</div>
					</div>
				</div>

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Goals for Next Period</label
						>
						<textarea
							bind:value={formData.goalsForNextPeriod}
							rows="3"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="next-goals"
							placeholder="Goals and objectives for next review period..."
						></textarea>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Development Plan</label>
						<textarea
							bind:value={formData.developmentPlan}
							rows="3"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="development-plan"
							placeholder="Professional development recommendations..."
						></textarea>
					</div>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Manager's Review Notes</label>
					<textarea
						bind:value={formData.reviewNotes}
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="review-notes"
						placeholder="Additional manager comments..."
					></textarea>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						data-testid="submit-review"
					>
						Update Review
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- View Review Modal -->
{#if showViewModal && currentReview}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="view-review-modal"
	>
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold" data-testid="modal-title">Performance Review Details</h2>
					<p class="text-gray-600">
						{currentReview.employee?.displayName} - {formatReviewPeriod(
							currentReview.reviewPeriodStart,
							currentReview.reviewPeriodEnd
						)}
					</p>
				</div>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<div class="space-y-6" data-testid="review-details">
				<!-- Rating Summary -->
				<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
					<div class="text-center">
						<p class="text-sm text-gray-600">Overall</p>
						<p class="text-2xl font-bold text-blue-600">{currentReview.overallRating || '-'}/5</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Goals</p>
						<p class="text-2xl font-bold text-green-600">
							{currentReview.goalsAchievement || '-'}/5
						</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Collaboration</p>
						<p class="text-2xl font-bold text-purple-600">{currentReview.collaboration || '-'}/5</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Communication</p>
						<p class="text-2xl font-bold text-orange-600">{currentReview.communication || '-'}/5</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Leadership</p>
						<p class="text-2xl font-bold text-red-600">{currentReview.leadership || '-'}/5</p>
					</div>
				</div>

				<!-- Review Details -->
				{#if currentReview.strengths}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Strengths</h4>
						<p class="rounded-md bg-green-50 p-3 text-gray-700">{currentReview.strengths}</p>
					</div>
				{/if}

				{#if currentReview.areasForImprovement}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Areas for Improvement</h4>
						<p class="rounded-md bg-orange-50 p-3 text-gray-700">
							{currentReview.areasForImprovement}
						</p>
					</div>
				{/if}

				{#if currentReview.goalsForNextPeriod}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Goals for Next Period</h4>
						<p class="rounded-md bg-blue-50 p-3 text-gray-700">
							{currentReview.goalsForNextPeriod}
						</p>
					</div>
				{/if}

				{#if currentReview.employeeSelfAssessment}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Employee Self-Assessment</h4>
						<p class="rounded-md bg-gray-50 p-3 text-gray-700">
							{currentReview.employeeSelfAssessment}
						</p>
					</div>
				{/if}

				{#if currentReview.reviewNotes}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Manager's Notes</h4>
						<p class="rounded-md bg-gray-50 p-3 text-gray-700">{currentReview.reviewNotes}</p>
					</div>
				{/if}
			</div>

			<div class="mt-6 flex justify-end">
				<button
					onclick={closeModals}
					class="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Success/Error Notifications (handled by svelte-sonner toast) -->
<div data-testid="success-notification" class="hidden"></div>
<div data-testid="access-denied" class="hidden"></div>
<div data-testid="empty-state" class="hidden"></div>
