<script lang="ts">
	import { formatDate } from '$lib/utils/dataTransformers.js';
	import type { ActivityItem } from '$lib/utils/dataTransformers.js';

	interface Props {
		activities: ActivityItem[];
		showCount?: number;
		class?: string;
	}

	let { activities, showCount = 0, class: className = '' }: Props = $props();

	let displayActivities = $derived(showCount > 0 ? activities.slice(0, showCount) : activities);
	let remainingCount = $derived(
		showCount > 0 && activities.length > showCount ? activities.length - showCount : 0
	);

	function getActivityTypeClass(type?: string): string {
		switch (type) {
			case 'employee':
				return 'bg-blue-100 text-blue-600';
			case 'task':
				return 'bg-green-100 text-green-600';
			case 'compliance':
				return 'bg-yellow-100 text-yellow-600';
			case 'system':
				return 'bg-gray-100 text-gray-600';
			default:
				return 'bg-purple-100 text-purple-600';
		}
	}
</script>

<div class="activity-feed {className}">
	{#each displayActivities as activity}
		<div class="activity-item">
			<div class="activity-indicator {getActivityTypeClass(activity.type)}">
				<div class="indicator-dot"></div>
			</div>
			<div class="activity-content">
				<div class="activity-header">
					<h4 class="activity-title">{activity.title}</h4>
					<time class="activity-time">{formatDate(activity.timestamp)}</time>
				</div>
				<p class="activity-description">{activity.description}</p>
			</div>
		</div>
	{/each}

	{#if remainingCount > 0}
		<div class="remaining-count">
			+{remainingCount} more activities
		</div>
	{/if}
</div>

<style>
	.activity-feed {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f3f4f6;
		transition: background-color 0.2s ease;
	}

	.activity-item:hover {
		background: #f3f4f6;
	}

	.activity-indicator {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}

	.indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.activity-content {
		flex: 1;
		min-width: 0;
	}

	.activity-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.activity-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		margin: 0;
		line-height: 1.25;
		flex: 1;
	}

	.activity-time {
		font-size: 0.75rem;
		color: #6b7280;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.activity-description {
		font-size: 0.75rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.4;
	}

	.remaining-count {
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px dashed #d1d5db;
	}

	/* Responsive Design */
	@media (max-width: 480px) {
		.activity-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.activity-time {
			white-space: normal;
		}
	}
</style>
