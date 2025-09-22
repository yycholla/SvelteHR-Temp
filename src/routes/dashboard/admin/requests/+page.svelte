<script lang="ts">
	import { onMount } from 'svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import {
		GET_PENDING_PROFILE_CHANGE_REQUESTS_QUERY,
		REVIEW_PROFILE_CHANGE_REQUEST_MUTATION,
		type ProfileChangeRequestWithUser,
		ProfileChangeRequestService
	} from '$lib/graphql/profile-change-requests-operations';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, XCircle, FileText, User, Clock, AlertCircle } from 'lucide-svelte';

	const client = createUrqlClient();

	let requests = $state<ProfileChangeRequestWithUser[]>([]);
	let loading = $state(true);
	let selectedRequest = $state<ProfileChangeRequestWithUser | null>(null);
	let reviewDialogOpen = $state(false);
	let reviewNotes = $state('');
	let submittingReview = $state(false);

	// Load pending requests
	async function loadRequests() {
		try {
			loading = true;
			const result = await client.query(GET_PENDING_PROFILE_CHANGE_REQUESTS_QUERY, {}).toPromise();

			if (result.data?.allPendingProfileChangeRequests?.nodes) {
				requests = result.data.allPendingProfileChangeRequests.nodes;
			}
		} catch (error) {
			console.error('Error loading requests:', error);
		} finally {
			loading = false;
		}
	}

	// Open review dialog
	function openReviewDialog(request: ProfileChangeRequestWithUser) {
		selectedRequest = request;
		reviewNotes = '';
		reviewDialogOpen = true;
	}

	// Submit review (approve/reject)
	async function submitReview(approve: boolean) {
		if (!selectedRequest) return;

		submittingReview = true;

		try {
			const result = await client.mutation(REVIEW_PROFILE_CHANGE_REQUEST_MUTATION, {
				requestId: selectedRequest.id,
				approve,
				reviewNotes: reviewNotes || undefined
			}).toPromise();

			if (result.data?.reviewProfileChangeRequest?.profileChangeRequest) {
				alert(`Request ${approve ? 'approved' : 'rejected'} successfully!`);
				reviewDialogOpen = false;
				selectedRequest = null;
				reviewNotes = '';

				// Reload requests
				await loadRequests();
			} else {
				throw new Error(result.error?.message || 'Failed to submit review');
			}
		} catch (error) {
			console.error('Error submitting review:', error);
			alert('Failed to submit review: ' + (error instanceof Error ? error.message : 'Unknown error'));
		} finally {
			submittingReview = false;
		}
	}

	onMount(() => {
		loadRequests();
	});
</script>

<svelte:head>
	<title>Profile Change Requests - SvelteHR</title>
	<meta name="description" content="Review and manage employee profile change requests" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
			<FileText class="h-8 w-8" />
			Profile Change Requests
		</h1>
		<p class="text-muted-foreground">
			Review and approve employee profile change requests
		</p>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center gap-3">
					<Clock class="h-8 w-8 text-amber-600" />
					<div>
						<p class="text-2xl font-bold">{requests.length}</p>
						<p class="text-sm text-muted-foreground">Pending Requests</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center gap-3">
					<User class="h-8 w-8 text-blue-600" />
					<div>
						<p class="text-2xl font-bold">{new Set(requests.map(r => r.userId)).size}</p>
						<p class="text-sm text-muted-foreground">Unique Employees</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center gap-3">
					<AlertCircle class="h-8 w-8 text-red-600" />
					<div>
						<p class="text-2xl font-bold">
							{requests.filter(r => {
								const daysSince = Math.floor((Date.now() - new Date(r.requestedAt).getTime()) / (1000 * 60 * 60 * 24));
								return daysSince > 2;
							}).length}
						</p>
						<p class="text-sm text-muted-foreground">Overdue (>2 days)</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Requests List -->
	{#if loading}
		<div class="text-center py-8">
			<p class="text-muted-foreground">Loading requests...</p>
		</div>
	{:else if requests.length === 0}
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<CheckCircle class="h-12 w-12 mx-auto text-green-600 mb-4" />
				<h3 class="text-lg font-semibold mb-2">No Pending Requests</h3>
				<p class="text-muted-foreground">All profile change requests have been reviewed.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each requests as request}
				<Card.Root>
					<Card.Content class="p-6">
						<div class="flex items-start justify-between">
							<div class="space-y-3 flex-1">
								<!-- User Info -->
								<div class="flex items-center gap-3">
									<User class="h-5 w-5 text-muted-foreground" />
									<div>
										<p class="font-semibold">{request.userDisplayName}</p>
										<p class="text-sm text-muted-foreground">{request.userEmail}</p>
									</div>
									<Badge variant="outline" class="ml-auto">
										{ProfileChangeRequestService.formatRelativeTime(request.requestedAt)}
									</Badge>
								</div>

								<!-- Requested Changes -->
								<div>
									<p class="text-sm font-medium mb-2">Requested Changes:</p>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
										{#each ProfileChangeRequestService.getChangesSummary(request) as change}
											<div class="flex items-center gap-2">
												<div class="w-2 h-2 bg-blue-600 rounded-full"></div>
												<span>{change}</span>
											</div>
										{/each}
									</div>
								</div>

								<!-- Reason -->
								{#if request.requestReason}
									<div>
										<p class="text-sm font-medium mb-1">Reason:</p>
										<p class="text-sm text-muted-foreground">{request.requestReason}</p>
									</div>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="flex items-center gap-2 ml-4">
								<Button
									variant="outline"
									size="sm"
									onclick={() => openReviewDialog(request)}
								>
									Review
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Review Dialog -->
<Dialog.Root bind:open={reviewDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Review Profile Change Request</Dialog.Title>
			<Dialog.Description>
				{#if selectedRequest}
					Review the profile change request from {selectedRequest.userDisplayName}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedRequest}
			<div class="space-y-4">
				<!-- Request Details -->
				<div class="space-y-2">
					<Label class="text-sm font-medium">Employee:</Label>
					<p class="text-sm">{selectedRequest.userDisplayName} ({selectedRequest.userEmail})</p>
				</div>

				<div class="space-y-2">
					<Label class="text-sm font-medium">Requested Changes:</Label>
					<div class="space-y-1">
						{#each ProfileChangeRequestService.getChangesSummary(selectedRequest) as change}
							<p class="text-sm text-muted-foreground">• {change}</p>
						{/each}
					</div>
				</div>

				{#if selectedRequest.requestReason}
					<div class="space-y-2">
						<Label class="text-sm font-medium">Reason:</Label>
						<p class="text-sm text-muted-foreground">{selectedRequest.requestReason}</p>
					</div>
				{/if}

				<!-- Review Notes -->
				<div class="space-y-2">
					<Label for="reviewNotes">Review Notes (Optional):</Label>
					<Textarea
						id="reviewNotes"
						bind:value={reviewNotes}
						placeholder="Add any notes about your decision..."
						rows={3}
					/>
				</div>
			</div>

			<Dialog.Footer class="flex justify-end gap-2">
				<Button
					variant="outline"
					onclick={() => submitReview(false)}
					disabled={submittingReview}
					class="flex items-center gap-2"
				>
					<XCircle class="h-4 w-4" />
					{submittingReview ? 'Rejecting...' : 'Reject'}
				</Button>
				<Button
					onclick={() => submitReview(true)}
					disabled={submittingReview}
					class="flex items-center gap-2"
				>
					<CheckCircle class="h-4 w-4" />
					{submittingReview ? 'Approving...' : 'Approve'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>