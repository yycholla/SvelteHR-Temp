<script lang="ts">
	import { page } from '$app/stores';
	import {
		AlertCircle,
		Calendar,
		CheckCircle,
		Clock,
		Filter,
		History,
		PieChart,
		Plane,
		Plus,
		Thermometer,
		User,
		XCircle
	} from '@lucide/svelte';
	import { format, parseISO } from 'date-fns';
	import { confirmService } from '$lib/stores/confirm.svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	const { data } = $props();

	// Extract data properties
	const user = $derived(data.user);
	const userId = $derived(data.userId);
	const leaveRequests = $derived(data.leaveRequests);
	const leaveBalances = $derived(data.leaveBalances);
	const leaveTypes = $derived(data.leaveTypes);
	const canManageLeave = $derived(data.canManageLeave);
	const isOwnLeave = $derived(data.isOwnLeave);

	let showNewRequestForm = $state(false);
	let newRequest = $state({
		leaveTypeId: '',
		startDate: '',
		endDate: '',
		reason: ''
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'approved':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			case 'rejected':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			case 'cancelled':
				return 'bg-muted text-muted-foreground border-border';
			case 'pending':
				return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function getLeaveTypeIcon(typeCode: string) {
		switch (typeCode?.toLowerCase()) {
			case 'sick':
				return Thermometer;
			case 'annual':
			case 'vacation':
				return Plane;
			default:
				return Calendar;
		}
	}

	function getLeaveTypeColor(color: string) {
		// Simplified mapping for the dot indicators
		switch (color) {
			case 'blue':
				return 'bg-blue-500';
			case 'red':
				return 'bg-red-500';
			case 'green':
				return 'bg-emerald-500';
			case 'purple':
				return 'bg-purple-500';
			case 'orange':
				return 'bg-orange-500';
			default:
				return 'bg-gray-500';
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

	async function handleSubmitRequest(event) {
		event.preventDefault();

		// Simulate API call
		try {
			console.log('Submitting leave request:', newRequest);
			// In a real app, await fetch(...) here

			toast.success('Request Submitted', {
				description: 'Your leave request has been submitted for approval.'
			});

			showNewRequestForm = false;
			newRequest = {
				leaveTypeId: '',
				startDate: '',
				endDate: '',
				reason: ''
			};
		} catch (error) {
			toast.error('Submission Failed', {
				description: 'Failed to submit leave request. Please try again.'
			});
		}
	}

	async function handleCancelRequest(requestId: string) {
		const confirmed = await confirmService.ask({
			title: 'Cancel Request',
			message: 'Are you sure you want to cancel this leave request? This action cannot be undone.',
			variant: 'destructive',
			confirmText: 'Yes, Cancel'
		});

		if (!confirmed) return;

		try {
			// Simulate API call
			console.log('Cancelling request:', requestId);

			toast.success('Request Cancelled', {
				description: 'The leave request has been successfully cancelled.'
			});
		} catch (error) {
			toast.error('Cancellation Failed', {
				description: 'Failed to cancel request. Please try again.'
			});
		}
	}
</script>

<svelte:head>
	<title>Leave Management - MountainHR</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Leave Management</h1>
			<p class="text-muted-foreground">Track your time off and submit new requests.</p>
		</div>
		<div class="flex items-center gap-3">
			{#if isOwnLeave}
				<Button onclick={() => (showNewRequestForm = true)} class="shadow-lg shadow-primary/20">
					<Plus class="mr-2 h-4 w-4" />
					New Request
				</Button>
			{/if}
		</div>
	</div>

	<!-- Main Bento Grid -->
	<div class="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
		<!-- Balances Section -->
		{#each leaveBalances as balance, i}
			{@const Icon = getLeaveTypeIcon(balance.leaveType?.code || '')}
			<!-- Make the first card span 2 cols if possible for emphasis, or just keeping them uniform -->
			<div
				class="flex flex-col justify-between rounded-xl border bg-card p-5 {i === 0
					? 'md:col-span-2'
					: ''}"
			>
				<div class="flex justify-between items-start">
					<div class="flex items-center gap-2 text-muted-foreground mb-2">
						<Icon class="h-4 w-4" />
						<span class="text-xs font-semibold uppercase tracking-wider"
							>{balance.leaveType?.name || 'Unknown Type'}</span
						>
					</div>
					<Badge variant="outline" class="bg-primary/5 text-primary border-primary/20">
						{balance.remaining} days left
					</Badge>
				</div>

				<div class="mt-4">
					<div class="mb-2 flex justify-between text-sm">
						<span class="text-muted-foreground"
							>Used: <span class="font-medium text-foreground">{balance.used}</span></span
						>
						<span class="text-muted-foreground"
							>Total: <span class="font-medium text-foreground">{balance.allocated}</span></span
						>
					</div>
					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full {getLeaveTypeColor(balance.leaveType?.color || 'gray')}"
							style="width: {(balance.used / balance.allocated) * 100}%"
						></div>
					</div>
				</div>
			</div>
		{/each}

		<!-- Pending Requests Summary (Small) -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5">
			<div class="mb-2 flex items-center gap-2 text-muted-foreground">
				<Clock class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Pending</span>
			</div>
			<div>
				<span class="text-3xl font-bold text-yellow-500">
					{leaveRequests.filter((r) => r.status === 'pending').length}
				</span>
				<p class="mt-1 text-xs text-muted-foreground">Awaiting Approval</p>
			</div>
		</div>

		<!-- Recent Requests (Large Table) -->
		<div
			class="flex flex-col overflow-hidden rounded-xl border bg-card md:col-span-3 lg:col-span-4 row-span-2"
		>
			<div class="flex items-center justify-between border-b border-border p-5">
				<div class="flex items-center gap-2 text-muted-foreground">
					<History class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Request History</span>
				</div>
				<!-- <Button variant="ghost" size="sm" class="gap-2">
					<Filter class="h-3.5 w-3.5" />
					Filter
				</Button> -->
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/30 text-xs font-medium uppercase text-muted-foreground">
						<tr>
							<th class="px-5 py-3">Type</th>
							<th class="px-5 py-3">Dates</th>
							<th class="px-5 py-3">Duration</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3">Submitted</th>
							<th class="px-5 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50">
						{#each leaveRequests as request}
							<tr class="transition-colors hover:bg-muted/20">
								<td class="px-5 py-4">
									<div class="flex items-center gap-2">
										<span class="h-2 w-2 rounded-full {getLeaveTypeColor(request.leaveType.color)}"
										></span>
										<span class="font-medium">{request.leaveType.name}</span>
									</div>
								</td>
								<td class="px-5 py-4 text-muted-foreground">
									{formatDateRange(request.startDate, request.endDate)}
								</td>
								<td class="px-5 py-4 text-foreground">
									{request.totalDays}
									{request.totalDays === 1 ? 'day' : 'days'}
								</td>
								<td class="px-5 py-4">
									<span
										class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium {getStatusColor(
											request.status
										)}"
									>
										{request.status.charAt(0).toUpperCase() + request.status.slice(1)}
									</span>
								</td>
								<td class="px-5 py-4 text-xs text-muted-foreground">
									{formatDate(request.requestedAt)}
								</td>
								<td class="px-5 py-4 text-right">
									{#if isOwnLeave && request.status === 'pending'}
										<button
											onclick={() => handleCancelRequest(request.id)}
											class="text-xs font-medium text-destructive hover:underline"
										>
											Cancel
										</button>
									{:else}
										<span class="text-xs text-muted-foreground">—</span>
									{/if}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-5 py-8 text-center text-xs text-muted-foreground">
									No leave requests found.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- New Request Form Modal -->
	{#if showNewRequestForm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		>
			<div class="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-foreground">New Leave Request</h2>
					<button
						onclick={() => (showNewRequestForm = false)}
						class="text-muted-foreground hover:text-foreground"
					>
						<XCircle class="h-5 w-5" />
					</button>
				</div>

				<form onsubmit={handleSubmitRequest} class="space-y-4">
					<div class="space-y-2">
						<label for="leaveType" class="text-sm font-medium text-foreground"> Leave Type </label>
						<select
							id="leaveType"
							bind:value={newRequest.leaveTypeId}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						>
							<option value="">Select leave type</option>
							{#each leaveTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<label for="startDate" class="text-sm font-medium text-foreground">
								Start Date
							</label>
							<input
								id="startDate"
								type="date"
								bind:value={newRequest.startDate}
								required
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							/>
						</div>
						<div class="space-y-2">
							<label for="endDate" class="text-sm font-medium text-foreground"> End Date </label>
							<input
								id="endDate"
								type="date"
								bind:value={newRequest.endDate}
								required
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<label for="reason" class="text-sm font-medium text-foreground"> Reason </label>
						<textarea
							id="reason"
							bind:value={newRequest.reason}
							rows="3"
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							placeholder="Briefly describe your request..."
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-2">
						<Button type="button" variant="outline" onclick={() => (showNewRequestForm = false)}>
							Cancel
						</Button>
						<Button type="submit">Submit Request</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
