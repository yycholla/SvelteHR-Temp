<script lang="ts">
	import StatCard from '$lib/components/common/StatCard.svelte';
	import {
		Calendar,
		Clock,
		CheckCircle,
		AlertCircle,
		Users,
		FileText,
		Plus,
		Edit,
		Eye
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { modalStore } from '$lib/stores/hr/modals.svelte';
	import { invalidateAll } from '$app/navigation';
	import LeaveModal from '$lib/components/hr/modals/LeaveModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Modal state
	let showLeaveModal = $state(false);
	let modalMode = $state<'create' | 'edit' | 'view'>('create');
	let selectedLeaveRequest = $state<any | null>(null);

	// Transform server data for display
	const stats = {
		totalRequests: data.leaveRequests?.length || 0,
		pendingApproval: data.stats?.pendingRequests || 0,
		approved: data.stats?.approvedRequests || 0,
		avgBalance: data.stats?.averageBalance || 0
	};

	// Subscribe to modal store
	$effect(() => {
		const unsubscribe = modalStore.subscribe((state) => {
			if (state.type === 'leave') {
				showLeaveModal = state.isOpen;
				modalMode = state.mode;
				selectedLeaveRequest = state.data;
			}
		});
		return unsubscribe;
	});

	// CRUD Operations
	function handleAddLeaveRequest() {
		modalStore.open('leave', null, 'create');
	}

	function handleViewLeaveRequest(request: any) {
		modalStore.open('leave', request, 'view');
	}

	function handleEditLeaveRequest(request: any) {
		modalStore.open('leave', request, 'edit');
	}

	async function handleLeaveRequestSuccess(leaveRequest: any) {
		modalStore.close();
		console.log('✅ Leave request saved successfully, refreshing data...');
		await invalidateAll();
	}

	function handleModalClose() {
		modalStore.close();
	}

	// Approval workflow functions
	async function handleApproveRequest(request: any) {
		if (
			confirm(
				`Approve leave request for ${request.employee?.first_name} ${request.employee?.last_name}?`
			)
		) {
			try {
				const response = await fetch(`/api/v2/leave-requests/${request.id}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ status: 'approved' })
				});

				if (response.ok) {
					console.log('✅ Leave request approved successfully');
					await invalidateAll();
				} else {
					const error = await response.text();
					alert(`Failed to approve request: ${error}`);
				}
			} catch (error) {
				console.error('Approval error:', error);
				alert('Failed to approve request. Please try again.');
			}
		}
	}

	async function handleRejectRequest(request: any) {
		if (
			confirm(
				`Reject leave request for ${request.employee?.first_name} ${request.employee?.last_name}?`
			)
		) {
			try {
				const response = await fetch(`/api/v2/leave-requests/${request.id}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ status: 'denied' })
				});

				if (response.ok) {
					console.log('✅ Leave request rejected successfully');
					await invalidateAll();
				} else {
					const error = await response.text();
					alert(`Failed to reject request: ${error}`);
				}
			} catch (error) {
				console.error('Rejection error:', error);
				alert('Failed to reject request. Please try again.');
			}
		}
	}
</script>

<svelte:head>
	<title>HR - Leave Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
		<p class="text-gray-600 dark:text-gray-400">Manage employee leave requests and balances</p>
	</div>

	<!-- Stats Overview -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<StatCard
			title="Total Requests"
			value={stats.totalRequests}
			icon={Calendar}
			tag="#hr"
			loading={false}
		/>
		<StatCard
			title="Pending Approval"
			value={stats.pendingApproval}
			icon={AlertCircle}
			tag="#hr"
			loading={false}
		/>
		<StatCard
			title="Approved"
			value={stats.approved}
			icon={CheckCircle}
			tag="#hr"
			loading={false}
		/>
		<StatCard
			title="Avg Balance"
			value={`${stats.avgBalance} days`}
			icon={Clock}
			tag="#hr"
			loading={false}
		/>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Leave Requests -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Calendar class="h-5 w-5 text-blue-600" />
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Leave Requests</h2>
				</div>
				<Button onclick={handleAddLeaveRequest} class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					New Request
				</Button>
			</div>

			{#if stats.totalRequests === 0}
				<div class="py-8 text-center">
					<Calendar class="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<p class="mb-4 text-gray-500">No leave requests found</p>
					<Button onclick={handleAddLeaveRequest} class="flex items-center gap-2">
						<Plus class="h-4 w-4" />
						Create First Request
					</Button>
				</div>
			{:else}
				<div class="leave-grid">
					{#each data.leaveRequests || [] as request}
						<div class="leave-card">
							<div class="leave-header">
								<div class="employee-info">
									<h4>{request.employee?.first_name} {request.employee?.last_name}</h4>
									{#if request.employee?.job_title}
										<p class="job-title">{request.employee.job_title}</p>
									{/if}
								</div>
								<div class="status-badge {request.status?.toLowerCase() || 'pending'}">
									{request.status || 'Pending'}
								</div>
							</div>
							<div class="leave-details">
								<p class="leave-type">{request.leaveType || 'General Leave'}</p>
								<p class="leave-dates">
									{new Date(request.startDate).toLocaleDateString()} -
									{new Date(request.endDate).toLocaleDateString()}
								</p>
								{#if request.reason}
									<p class="leave-reason">{request.reason}</p>
								{/if}
								{#if request.approver}
									<p class="approver-info">
										<Users class="mr-1 inline h-4 w-4" />
										Approved by: {request.approver.first_name}
										{request.approver.last_name}
									</p>
								{/if}
							</div>
							<div class="action-buttons">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleViewLeaveRequest(request)}
									title="View details"
								>
									<Eye class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleEditLeaveRequest(request)}
									title="Edit request"
								>
									<Edit class="h-4 w-4" />
								</Button>
								{#if request.status === 'Pending'}
									<Button
										variant="outline"
										size="sm"
										onclick={() => handleApproveRequest(request)}
										class="text-green-600 hover:text-green-700"
									>
										<CheckCircle class="h-4 w-4" />
										Approve
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => handleRejectRequest(request)}
										class="text-red-600 hover:text-red-700"
									>
										<AlertCircle class="h-4 w-4" />
										Reject
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Employee Leave Balances -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-6 flex items-center gap-2">
				<Clock class="h-5 w-5 text-green-600" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Employee Leave Balances</h2>
			</div>

			{#if !data.leaveBalances || data.leaveBalances.length === 0}
				<div class="py-8 text-center">
					<Clock class="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<p class="text-gray-500">No leave balances available</p>
				</div>
			{:else}
				<div class="balance-grid">
					{#each data.leaveBalances.slice(0, 10) as balance}
						<div class="balance-card">
							<div class="balance-header">
								<div class="employee-name">
									<Users class="mr-2 inline h-4 w-4" />
									{balance.employee?.first_name}
									{balance.employee?.last_name}
								</div>
								<div class="leave-type-badge">
									{balance.leaveType}
								</div>
							</div>
							<div class="balance-details">
								<div class="balance-item">
									<span class="balance-label">Available:</span>
									<span class="balance-value available">{balance.available || 0} days</span>
								</div>
								<div class="balance-item">
									<span class="balance-label">Used:</span>
									<span class="balance-value used">{balance.used || 0} days</span>
								</div>
								<div class="balance-item">
									<span class="balance-label">Total:</span>
									<span class="balance-value total"
										>{(balance.available || 0) + (balance.used || 0)} days</span
									>
								</div>
							</div>
						</div>
					{/each}
				</div>
				<div class="mt-4 text-center">
					<button class="btn-secondary inline-flex items-center gap-2">
						<FileText class="h-4 w-4" />
						View All Balances
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Leave Modal -->
<LeaveModal
	bind:open={showLeaveModal}
	bind:leaveRequest={selectedLeaveRequest}
	bind:mode={modalMode}
	onCancel={handleModalClose}
	onSuccess={handleLeaveRequestSuccess}
/>

<style>
	.leave-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.leave-card {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.leave-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.leave-header h4 {
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		flex: 1;
	}

	.employee-info h4 {
		margin: 0;
		font-weight: 600;
		color: #1f2937;
	}

	.job-title {
		color: #6b7280;
		font-size: 0.75rem;
		margin: 0;
		margin-top: 0.125rem;
	}

	.leave-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.leave-type {
		font-weight: 500;
		color: #4f46e5;
		margin: 0;
	}

	.leave-dates {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}

	.leave-reason {
		color: #374151;
		font-size: 0.875rem;
		margin: 0;
		font-style: italic;
	}

	.approver-info {
		color: #059669;
		font-size: 0.75rem;
		margin-top: 0.5rem;
		margin-bottom: 0;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.status-badge.approved {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.pending {
		background: #fef3c7;
		color: #d97706;
	}

	.status-badge.rejected {
		background: #fee2e2;
		color: #dc2626;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.btn-approve,
	.btn-reject {
		display: inline-flex;
		align-items: center;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
	}

	.btn-approve {
		background: #dcfce7;
		color: #166534;
	}

	.btn-approve:hover {
		background: #bbf7d0;
	}

	.btn-reject {
		background: #fee2e2;
		color: #dc2626;
	}

	.btn-reject:hover {
		background: #fecaca;
	}

	.balance-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.balance-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 0.75rem;
	}

	.balance-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.employee-name {
		font-weight: 600;
		color: #1e293b;
		font-size: 0.875rem;
	}

	.leave-type-badge {
		background: #ddd6fe;
		color: #5b21b6;
		font-size: 0.625rem;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.balance-details {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.balance-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.balance-label {
		color: #64748b;
		font-size: 0.75rem;
	}

	.balance-value {
		font-weight: 600;
		font-size: 0.75rem;
	}

	.balance-value.available {
		color: #059669;
	}

	.balance-value.used {
		color: #dc2626;
	}

	.balance-value.total {
		color: #1e293b;
	}

	.btn-secondary {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		background: #e2e8f0;
		border-color: #94a3b8;
	}
</style>
