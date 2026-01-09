<script lang="ts">
	import { AlertCircle, Check, Clock, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		formatDateRange,
		getLeaveTypeColor,
		leaveTypeOptions
	} from '$lib/graphql/queries/leave-requests';

	interface Props {
		filteredRequests: any[];
		leaveStats: any;
		totalRequests: number;
		selectedView: string;
		canApproveLeave: boolean;
		onViewChange: (view: string) => void;
		onApprove: (request: any) => void;
		onDeny: (request: any) => void;
		onRevert: (request: any) => void;
	}

	let {
		filteredRequests,
		leaveStats,
		totalRequests,
		selectedView = $bindable(),
		canApproveLeave,
		onViewChange,
		onApprove,
		onDeny,
		onRevert
	}: Props = $props();

	// Get initials for avatar
	function getInitials(name: string): string {
		return (
			name
				?.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase() || 'U'
		);
	}

	// Get status badge variant
	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'approved':
				return 'default';
			case 'pending':
				return 'secondary';
			case 'rejected':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<Tabs
	value={selectedView}
	onValueChange={(value) => {
		selectedView = value;
		onViewChange(value);
	}}
>
	<TabsList class="grid w-full grid-cols-4">
		<TabsTrigger value="pending">
			Pending ({leaveStats.pendingCount})
		</TabsTrigger>
		<TabsTrigger value="approved">
			Approved ({leaveStats.approvedCount})
		</TabsTrigger>
		<TabsTrigger value="rejected">
			Rejected ({leaveStats.rejectedCount})
		</TabsTrigger>
		<TabsTrigger value="all">
			All Requests ({totalRequests})
		</TabsTrigger>
	</TabsList>

	<TabsContent value={selectedView} class="mt-4">
		<!-- Leave Requests List -->
		<div class="space-y-4" data-testid="hr-leave-requests-table">
			{#if filteredRequests.length === 0}
				<Card>
					<CardContent class="p-8 text-center">
						<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-semibold text-foreground">No requests found</h3>
						<p class="text-muted-foreground">
							{#if selectedView === 'pending'}
								No pending leave requests at the moment.
							{:else if selectedView === 'approved'}
								No approved leave requests found.
							{:else if selectedView === 'rejected'}
								No rejected leave requests found.
							{:else}
								No leave requests match your current filters.
							{/if}
						</p>
					</CardContent>
				</Card>
			{:else}
				{#each filteredRequests as request}
					<Card class="transition-shadow hover:shadow-md">
						<CardContent class="p-6">
							<div class="flex items-start justify-between">
								<!-- Request Info -->
								<div class="flex flex-1 items-start space-x-4">
									<!-- Employee Avatar -->
									<Avatar class="h-12 w-12">
										<AvatarFallback class="bg-blue-100 text-blue-700">
											{getInitials(request.employee?.displayName || '')}
										</AvatarFallback>
									</Avatar>

									<!-- Request Details -->
									<div class="flex-1 space-y-2">
										<div class="flex items-center gap-3">
											<h3 class="text-lg font-semibold text-foreground">
												{request.employee?.displayName || 'Unknown Employee'}
											</h3>
											<Badge variant={getStatusBadgeVariant(request.status)} class="capitalize">
												{request.status}
											</Badge>
											<Badge
												variant="outline"
												class={`bg-${getLeaveTypeColor(request.leaveType)}-50 text-${getLeaveTypeColor(request.leaveType)}-700 border-${getLeaveTypeColor(request.leaveType)}-200`}
											>
												{leaveTypeOptions.find((t) => t.value === request.leaveType)?.label ||
													request.leaveType}
											</Badge>
										</div>

										<div class="space-y-1 text-sm text-muted-foreground">
											<p>
												<strong>Department:</strong>
												{request.employee?.department?.name || 'N/A'}
											</p>
											<p>
												<strong>Dates:</strong>
												{formatDateRange(request.startDate, request.endDate)}
											</p>
											<p><strong>Duration:</strong> {request.daysRequested} days</p>
											{#if request.reason}
												<p><strong>Reason:</strong> {request.reason}</p>
											{/if}
											{#if request.managerComments}
												<p><strong>Manager Comments:</strong> {request.managerComments}</p>
											{/if}
										</div>

										<div class="text-xs text-muted-foreground">
											Requested on {new Date(request.createdAt).toLocaleDateString()}
										</div>
									</div>
								</div>

								<!-- Actions -->
								{#if canApproveLeave}
									{#if request.status === 'pending'}
										<div class="ml-4 flex gap-2">
											<Button
												size="sm"
												variant="outline"
												onclick={() => onApprove(request)}
												class="border-green-200 text-green-600 hover:border-green-300 hover:text-green-700"
												data-testid="hr-approve-button"
											>
												<Check class="mr-1 h-4 w-4" />
												Approve
											</Button>
											<Button
												size="sm"
												variant="outline"
												onclick={() => onDeny(request)}
												class="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
												data-testid="hr-reject-button"
											>
												<X class="mr-1 h-4 w-4" />
												Deny
											</Button>
										</div>
									{:else if request.status === 'approved' || request.status === 'rejected'}
										<div class="ml-4">
											<Button
												size="sm"
												variant="outline"
												onclick={() => onRevert(request)}
												class="border-amber-200 text-amber-600 hover:border-amber-300 hover:text-amber-700"
											>
												<Clock class="mr-1 h-4 w-4" />
												Revert to Pending
											</Button>
										</div>
									{/if}
								{/if}
							</div>
						</CardContent>
					</Card>
				{/each}
			{/if}
		</div>
	</TabsContent>
</Tabs>
