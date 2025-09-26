<script lang="ts">
	import { page } from '$app/stores';
	import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, User, FileText } from 'lucide-svelte';
	import { format, parseISO, differenceInDays } from 'date-fns';

	let { data } = $props();

	$: ({
		user,
		userId,
		leaveRequests,
		leaveBalances,
		leaveTypes,
		canManageLeave,
		isOwnLeave
	} = data);

	let showNewRequestForm = $state(false);
	let newRequest = $state({
		leaveTypeId: '',
		startDate: '',
		endDate: '',
		reason: ''
	});

	function getStatusIcon(status: string) {
		switch (status) {
			case 'approved': return CheckCircle;
			case 'rejected': return XCircle;
			case 'cancelled': return XCircle;
			case 'pending': return Clock;
			default: return AlertCircle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'approved': return 'text-green-600 bg-green-50 border-green-200';
			case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
			case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
			case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getLeaveTypeColor(color: string) {
		switch (color) {
			case 'blue': return 'bg-blue-100 text-blue-800';
			case 'red': return 'bg-red-100 text-red-800';
			case 'green': return 'bg-green-100 text-green-800';
			case 'purple': return 'bg-purple-100 text-purple-800';
			case 'gray': return 'bg-gray-100 text-gray-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDate(dateString: string) {
		return format(parseISO(dateString), 'MMM dd, yyyy');
	}

	function formatDateRange(startDate: string, endDate: string) {
		const start = parseISO(startDate);
		const end = parseISO(endDate);

		if (format(start, 'yyyy-MM') === format(end, 'yyyy-MM')) {
			return `${format(start, 'MMM dd')} - ${format(end, 'dd, yyyy')}`;
		}
		return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
	}

	async function handleSubmitRequest() {
		// TODO: Implement actual leave request submission
		console.log('Submitting leave request:', newRequest);
		showNewRequestForm = false;
		newRequest = {
			leaveTypeId: '',
			startDate: '',
			endDate: '',
			reason: ''
		};
	}

	async function handleCancelRequest(requestId: string) {
		// TODO: Implement request cancellation
		console.log('Cancelling request:', requestId);
	}
</script>

<svelte:head>
	<title>{isOwnLeave ? 'My Leave Requests' : `${user?.displayName} - Leave Requests`} | SvelteHR</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
				<Calendar class="h-6 w-6 text-green-600" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-gray-900">
					{isOwnLeave ? 'My Leave Requests' : `${user?.displayName} - Leave Requests`}
				</h1>
				<p class="text-gray-600">
					{user?.departmentByDepartmentId?.name || 'No Department'} • {user?.role}
				</p>
			</div>
		</div>

		{#if isOwnLeave}
			<button
				onclick={() => showNewRequestForm = true}
				class="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
			>
				<Plus class="h-4 w-4" />
				New Request
			</button>
		{/if}
	</div>

	<!-- Leave Balances -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each leaveBalances as balance}
			<div class="rounded-lg bg-white p-6 shadow-sm border">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getLeaveTypeColor(balance.leaveType.color)}">
							{balance.leaveType.name}
						</span>
					</div>
				</div>
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Allocated:</span>
						<span class="font-medium">{balance.allocated} days</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Used:</span>
						<span class="font-medium text-red-600">{balance.used} days</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Pending:</span>
						<span class="font-medium text-yellow-600">{balance.pending} days</span>
					</div>
					<div class="border-t pt-2">
						<div class="flex justify-between text-sm font-semibold">
							<span class="text-gray-900">Remaining:</span>
							<span class="text-green-600">{balance.remaining} days</span>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- New Request Form Modal -->
	{#if showNewRequestForm}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">New Leave Request</h2>
				<form onsubmit|preventDefault={handleSubmitRequest} class="space-y-4">
					<div>
						<label for="leaveType" class="block text-sm font-medium text-gray-700 mb-1">
							Leave Type
						</label>
						<select
							id="leaveType"
							bind:value={newRequest.leaveTypeId}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						>
							<option value="">Select leave type</option>
							{#each leaveTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
								Start Date
							</label>
							<input
								id="startDate"
								type="date"
								bind:value={newRequest.startDate}
								required
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
							/>
						</div>
						<div>
							<label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
								End Date
							</label>
							<input
								id="endDate"
								type="date"
								bind:value={newRequest.endDate}
								required
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
							/>
						</div>
					</div>

					<div>
						<label for="reason" class="block text-sm font-medium text-gray-700 mb-1">
							Reason
						</label>
						<textarea
							id="reason"
							bind:value={newRequest.reason}
							rows="3"
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
							placeholder="Please provide a reason for your leave request..."
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={() => showNewRequestForm = false}
							class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
						>
							Submit Request
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Leave Requests -->
	<div class="rounded-lg bg-white shadow-sm border">
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-semibold text-gray-900">Leave History</h2>
		</div>
		<div class="overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Leave Type
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Dates
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Days
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Status
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Requested
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Reason
							</th>
							{#if isOwnLeave}
								<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
									Actions
								</th>
							{/if}
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each leaveRequests as request}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4 text-sm">
									<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getLeaveTypeColor(request.leaveType.color)}">
										{request.leaveType.name}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
									{formatDateRange(request.startDate, request.endDate)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
									{request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm">
									<div class="flex items-center gap-2">
										<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium {getStatusColor(request.status)}">
											<svelte:component
												this={getStatusIcon(request.status)}
												class="h-3 w-3"
											/>
											{request.status.charAt(0).toUpperCase() + request.status.slice(1)}
										</span>
									</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
									{formatDate(request.requestedAt)}
								</td>
								<td class="px-6 py-4 text-sm text-gray-600 max-w-xs">
									<div class="truncate" title={request.reason}>
										{request.reason}
									</div>
									{#if request.comments}
										<div class="mt-1 text-xs text-red-600">
											{request.comments}
										</div>
									{/if}
								</td>
								{#if isOwnLeave}
									<td class="whitespace-nowrap px-6 py-4 text-sm">
										{#if request.status === 'pending'}
											<button
												onclick={() => handleCancelRequest(request.id)}
												class="text-red-600 hover:text-red-900 text-sm font-medium"
											>
												Cancel
											</button>
										{:else}
											<span class="text-gray-400">—</span>
										{/if}
									</td>
								{/if}
							</tr>
						{:else}
							<tr>
								<td colspan={isOwnLeave ? "7" : "6"} class="px-6 py-8 text-center text-sm text-gray-500">
									No leave requests found.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>