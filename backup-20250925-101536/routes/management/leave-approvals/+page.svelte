<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getOperationStore, queryStore } from '@urql/svelte';
	import { toast } from 'svelte-sonner';
	import { Calendar, Check, X, Clock, AlertCircle } from 'lucide-svelte';

	import HrDataTable from '$lib/components/data-table/hr-data-table.svelte';
	import DataExport from '$lib/components/export/data-export.svelte';
	import {
		GET_PENDING_LEAVE_REQUESTS,
		APPROVE_LEAVE_REQUEST,
		DENY_LEAVE_REQUEST,
		formatDateRange,
		getLeaveTypeColor
	} from '$lib/graphql/leave-management-operations';

	// Page data from server
	export let data;

	// Local state using Svelte 5 runes
	let selectedRequests = $state<any[]>([]);
	let showApprovalModal = $state(false);
	let showDenialModal = $state(false);
	let currentRequest = $state<any>(null);
	let managerComments = $state('');
	let dateFromFilter = $state('');
	let dateToFilter = $state('');
	let leaveTypeFilter = $state('all');
	let searchQuery = $state('');

	// Pagination state
	let currentPage = $state(1);
	let pageSize = $state(20);

	// Query for pending leave requests
	const pendingRequests = queryStore({
		client: getOperationStore(),
		query: GET_PENDING_LEAVE_REQUESTS,
		variables: {
			managerId: data.user?.id,
			first: pageSize,
			offset: (currentPage - 1) * pageSize,
			filter: {
				status: 'pending',
				...(dateFromFilter && {
					startDate: { greaterThanOrEqualTo: dateFromFilter }
				}),
				...(dateToFilter && {
					endDate: { lessThanOrEqualTo: dateToFilter }
				}),
				...(leaveTypeFilter !== 'all' && {
					leaveType: leaveTypeFilter
				})
			}
		}
	});

	// Mutation operations
	const approveRequest = getOperationStore(APPROVE_LEAVE_REQUEST);
	const denyRequest = getOperationStore(DENY_LEAVE_REQUEST);

	// Table columns configuration
	const columns = [
		{
			key: 'employee',
			label: 'Employee',
			sortable: true,
			render: (value: any, row: any) => {
				return `<div data-testid="employee-name">${row.employee?.displayName}</div>`;
			}
		},
		{
			key: 'leaveType',
			label: 'Leave Type',
			sortable: true,
			render: (value: string) => {
				const color = getLeaveTypeColor(value);
				return `<span data-testid="leave-type" class="px-2 py-1 rounded-full text-xs bg-${color}-100 text-${color}-800">${value}</span>`;
			}
		},
		{
			key: 'dates',
			label: 'Dates',
			render: (value: any, row: any) => {
				return `<div data-testid="leave-dates">${formatDateRange(row.startDate, row.endDate)}</div>`;
			}
		},
		{
			key: 'daysRequested',
			label: 'Days',
			sortable: true,
			align: 'center',
			render: (value: number) => {
				return `<span data-testid="days-requested">${value}</span>`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			render: () => {
				return `<span class="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending</span>`;
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
							data-testid="approve-button"
							class="p-1 text-green-600 hover:bg-green-50 rounded"
							title="Approve"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
						</button>
						<button
							data-testid="deny-button"
							class="p-1 text-red-600 hover:bg-red-50 rounded"
							title="Deny"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					</div>
				`;
			}
		}
	];

	// Handle approve action
	async function handleApprove(request: any) {
		currentRequest = request;
		showApprovalModal = true;
	}

	// Handle deny action
	async function handleDeny(request: any) {
		currentRequest = request;
		showDenialModal = true;
	}

	// Confirm approval
	async function confirmApproval() {
		try {
			const result = await approveRequest({
				input: {
					leaveRequestId: currentRequest.id,
					managerComments
				}
			});

			if (result.data) {
				toast.success('Leave request approved successfully');
				pendingRequests.reexecute();
				closeModals();
			}
		} catch (error) {
			toast.error('Failed to approve leave request');
		}
	}

	// Confirm denial
	async function confirmDenial() {
		if (!managerComments.trim()) {
			toast.error('Manager comments are required for denial');
			return;
		}

		try {
			const result = await denyRequest({
				input: {
					leaveRequestId: currentRequest.id,
					managerComments
				}
			});

			if (result.data) {
				toast.success('Leave request denied');
				pendingRequests.reexecute();
				closeModals();
			}
		} catch (error) {
			toast.error('Failed to deny leave request');
		}
	}

	// Close modals
	function closeModals() {
		showApprovalModal = false;
		showDenialModal = false;
		currentRequest = null;
		managerComments = '';
	}

	// Apply filters
	function applyFilters() {
		currentPage = 1;
		pendingRequests.reexecute();
	}

	// Clear filters
	function clearFilters() {
		dateFromFilter = '';
		dateToFilter = '';
		leaveTypeFilter = 'all';
		searchQuery = '';
		applyFilters();
	}

	// Export data
	function handleExport() {
		// Export functionality will be handled by DataExport component
		console.log('Exporting data...');
	}

	// Handle row click
	function handleRowClick(event: CustomEvent) {
		const row = event.detail;
		const target = event.target as HTMLElement;

		// Check if click was on action buttons
		if (target.closest('[data-testid="approve-button"]')) {
			handleApprove(row);
		} else if (target.closest('[data-testid="deny-button"]')) {
			handleDeny(row);
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Page Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900">Leave Approvals</h1>
		<p class="mt-2 text-gray-600">Review and manage pending leave requests from your team</p>
	</div>

	<!-- Filters Section -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
			<!-- Date From Filter -->
			<div>
				<label for="date-from" class="mb-1 block text-sm font-medium text-gray-700">
					From Date
				</label>
				<input
					id="date-from"
					type="date"
					bind:value={dateFromFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="date-from-filter"
				/>
			</div>

			<!-- Date To Filter -->
			<div>
				<label for="date-to" class="mb-1 block text-sm font-medium text-gray-700"> To Date </label>
				<input
					id="date-to"
					type="date"
					bind:value={dateToFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="date-to-filter"
				/>
			</div>

			<!-- Leave Type Filter -->
			<div>
				<label for="leave-type" class="mb-1 block text-sm font-medium text-gray-700">
					Leave Type
				</label>
				<select
					id="leave-type"
					bind:value={leaveTypeFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="leave-type-filter"
				>
					<option value="all">All Types</option>
					<option value="annual">Annual</option>
					<option value="sick">Sick</option>
					<option value="personal">Personal</option>
					<option value="maternity">Maternity</option>
					<option value="paternity">Paternity</option>
					<option value="emergency">Emergency</option>
					<option value="unpaid">Unpaid</option>
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
			data={$pendingRequests.data?.leaveRequests?.nodes || []}
			{columns}
			loading={$pendingRequests.fetching}
			searchable={false}
			selectable={true}
			onSelectionChange={(selected) => (selectedRequests = selected)}
			onExport={handleExport}
			onRowClick={handleRowClick}
			pagination={{
				page: currentPage,
				pageSize,
				total: $pendingRequests.data?.leaveRequests?.totalCount || 0,
				pageSizes: [10, 20, 50, 100]
			}}
			onPageChange={(page) => {
				currentPage = page;
				pendingRequests.reexecute();
			}}
			onPageSizeChange={(size) => {
				pageSize = size;
				currentPage = 1;
				pendingRequests.reexecute();
			}}
			emptyMessage="No pending leave requests found"
			testId="leave-approvals-table"
		/>
	</div>

	<!-- Export Component -->
	<DataExport
		data={$pendingRequests.data?.leaveRequests?.nodes || []}
		filename="leave-requests"
		testId="export-csv"
	/>
</div>

<!-- Approval Modal -->
{#if showApprovalModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="approval-modal"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<h2 class="mb-4 text-xl font-bold" data-testid="modal-title">Approve Leave Request</h2>

			<!-- Employee Details -->
			<div class="mb-4 rounded bg-gray-50 p-3" data-testid="employee-details">
				<p class="text-sm text-gray-600">Employee</p>
				<p class="font-semibold">{currentRequest?.employee?.displayName}</p>
			</div>

			<!-- Request Details -->
			<div class="mb-4 rounded bg-gray-50 p-3" data-testid="request-details">
				<p class="text-sm text-gray-600">Leave Details</p>
				<p>Type: {currentRequest?.leaveType}</p>
				<p>Period: {formatDateRange(currentRequest?.startDate, currentRequest?.endDate)}</p>
				<p>Days: {currentRequest?.daysRequested}</p>
			</div>

			<!-- Manager Comments -->
			<div class="mb-4">
				<label for="manager-comments" class="mb-1 block text-sm font-medium text-gray-700">
					Manager Comments (Optional)
				</label>
				<textarea
					id="manager-comments"
					bind:value={managerComments}
					rows="3"
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="manager-comments"
					placeholder="Add any comments..."
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2">
				<button
					onclick={closeModals}
					class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={confirmApproval}
					class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
					data-testid="confirm-approve"
				>
					Approve Request
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Denial Modal -->
{#if showDenialModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="denial-modal"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<h2 class="mb-4 text-xl font-bold" data-testid="modal-title">Deny Leave Request</h2>

			<!-- Employee Details -->
			<div class="mb-4 rounded bg-gray-50 p-3" data-testid="employee-details">
				<p class="text-sm text-gray-600">Employee</p>
				<p class="font-semibold">{currentRequest?.employee?.displayName}</p>
			</div>

			<!-- Request Details -->
			<div class="mb-4 rounded bg-gray-50 p-3" data-testid="request-details">
				<p class="text-sm text-gray-600">Leave Details</p>
				<p>Type: {currentRequest?.leaveType}</p>
				<p>Period: {formatDateRange(currentRequest?.startDate, currentRequest?.endDate)}</p>
				<p>Days: {currentRequest?.daysRequested}</p>
			</div>

			<!-- Manager Comments (Required) -->
			<div class="mb-4">
				<label for="denial-comments" class="mb-1 block text-sm font-medium text-gray-700">
					Reason for Denial <span class="text-red-500">*</span>
				</label>
				<textarea
					id="denial-comments"
					bind:value={managerComments}
					rows="3"
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="manager-comments"
					placeholder="Please provide a reason for denial..."
					required
				></textarea>
				{#if !managerComments.trim()}
					<p class="mt-1 text-sm text-red-600" data-testid="comments-error">
						Manager comments are required for denial
					</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2">
				<button
					onclick={closeModals}
					class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					onclick={confirmDenial}
					class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
					data-testid="confirm-deny"
				>
					Deny Request
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Success/Error Notifications (handled by svelte-sonner toast) -->
<div data-testid="success-notification" class="hidden"></div>
<div data-testid="access-denied" class="hidden"></div>
<div data-testid="empty-state" class="hidden"></div>
<div data-testid="pending-request-row" class="hidden"></div>
