<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	interface RollbackRequest {
		requestedBy: {
			fullName: string;
			email: string;
			department: string;
		};
		reason: string;
		status: 'pending' | 'approved' | 'rejected';
		reviewedBy?: {
			id: string;
			fullName: string;
		};
		reviewedAt?: string;
		reviewReason?: string;
		activityLog: {
			action: 'CREATE' | 'UPDATE' | 'DELETE';
			resourceType: string;
			resourceId: string;
			beforeSnapshot: Record<string, unknown>;
			afterSnapshot: Record<string, unknown>;
		};
	}

	interface Props {
		request: RollbackRequest;
		isExpanded: boolean;
	}

	const { request, isExpanded }: Props = $props();

	const actionBadgeColor = $derived.by(() => {
		switch (request.activityLog.action) {
			case 'CREATE':
				return 'blue';
			case 'UPDATE':
				return 'yellow';
			case 'DELETE':
				return 'red';
			default:
				return 'gray';
		}
	});
</script>

<div class="card-body">
	<div class="requester-section">
		<h4>Requested By</h4>
		<p class="requester-name">{request.requestedBy.fullName}</p>
		<p class="requester-details">{request.requestedBy.email}</p>
		<p class="requester-details">{request.requestedBy.department}</p>
	</div>

	<div class="log-section">
		<h4>Activity Log</h4>
		<div class="log-details">
			<span class="action-badge" data-color={actionBadgeColor}>
				{request.activityLog.action}
			</span>
			<span class="resource-info">
				{request.activityLog.resourceType} / {request.activityLog.resourceId.slice(0, 8)}...
			</span>
		</div>
	</div>

	<div class="reason-section">
		<h4>Reason</h4>
		<p class="reason-text">{request.reason}</p>
	</div>

	{#if isExpanded}
		<div class="snapshot-section">
			<h4>Snapshot Preview</h4>
			<div class="snapshot-grid">
				<div class="snapshot-column">
					<h5>Before</h5>
					<pre>{JSON.stringify(request.activityLog.beforeSnapshot, null, 2).slice(0, 200)}...</pre>
				</div>
				<div class="snapshot-column">
					<h5>After</h5>
					<pre>{JSON.stringify(request.activityLog.afterSnapshot, null, 2).slice(0, 200)}...</pre>
				</div>
			</div>
		</div>
	{/if}

	{#if request.status !== 'pending' && request.reviewedBy}
		<div class="review-section">
			<h4>Review</h4>
			<p class="reviewer-info">
				Reviewed by {request.reviewedBy.fullName}
				{#if request.reviewedAt}
					{formatDistanceToNow(new Date(request.reviewedAt), { addSuffix: true })}
				{/if}
			</p>
			{#if request.reviewReason}
				<p class="review-reason">{request.reviewReason}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.card-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.requester-section,
	.log-section,
	.reason-section,
	.snapshot-section,
	.review-section {
		padding-bottom: 0.75rem;
	}

	.requester-section:not(:last-child),
	.log-section:not(:last-child),
	.reason-section:not(:last-child),
	.snapshot-section:not(:last-child),
	.review-section:not(:last-child) {
		border-bottom: 1px solid #f3f4f6;
	}

	h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	h5 {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
	}

	.requester-name {
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.25rem;
	}

	.requester-details {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.log-details {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.action-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.action-badge[data-color='blue'] {
		background-color: #dbeafe;
		color: #1e40af;
	}

	.action-badge[data-color='yellow'] {
		background-color: #fef3c7;
		color: #92400e;
	}

	.action-badge[data-color='red'] {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.resource-info {
		font-size: 0.875rem;
		color: #6b7280;
		font-family: monospace;
	}

	.reason-text {
		font-size: 0.875rem;
		color: #374151;
		line-height: 1.5;
	}

	.snapshot-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.snapshot-column pre {
		font-size: 0.75rem;
		background-color: #f9fafb;
		padding: 0.75rem;
		border-radius: 0.375rem;
		overflow-x: auto;
		color: #374151;
		font-family: monospace;
	}

	.reviewer-info {
		font-size: 0.875rem;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.review-reason {
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
	}
</style>
