<script lang="ts">
	import type { DepartmentData } from '$lib/utils/dataTransformers.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Props {
		departments: DepartmentData[];
		showPercentage?: boolean;
		showCount?: boolean;
		showProgress?: boolean;
		class?: string;
	}

	let { 
		departments, 
		showPercentage = true,
		showCount = true,
		showProgress = true,
		class: className = ''
	}: Props = $props();

	function getDepartmentColor(index: number): string {
		const colors = [
			'#6366f1', // Indigo
			'#8b5cf6', // Violet  
			'#06b6d4', // Cyan
			'#10b981', // Emerald
			'#f59e0b', // Amber
			'#ef4444', // Red
			'#84cc16', // Lime
			'#f97316', // Orange
		];
		return colors[index % colors.length];
	}
</script>

<div class="department-chart {className}">
	{#each departments as dept, index}
		<div class="department-item">
			<div class="department-header">
				<div class="department-info">
					<h4 class="department-name">{dept.department}</h4>
					<div class="department-stats">
						{#if showCount}
							<Badge variant="secondary" class="count-badge">
								{dept.count} employee{dept.count !== 1 ? 's' : ''}
							</Badge>
						{/if}
						{#if showPercentage}
							<span class="percentage-text">{dept.percentage}%</span>
						{/if}
					</div>
				</div>
			</div>
			
			{#if showProgress}
				<div class="progress-container">
					<div class="progress-bar">
						<div 
							class="progress-fill"
							style="width: {dept.percentage}%; background-color: {getDepartmentColor(index)}"
						></div>
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.department-chart {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.department-item {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f3f4f6;
		transition: all 0.2s ease;
	}

	.department-item:hover {
		background: #f3f4f6;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.department-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.department-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.department-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		margin: 0;
		line-height: 1.25;
	}

	.department-stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.count-badge {
		font-size: 0.75rem;
	}

	.percentage-text {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.progress-container {
		width: 100%;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #f3f4f6;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.6s ease-in-out;
		animation: expand 0.6s ease-in-out;
	}

	@keyframes expand {
		from { width: 0; }
	}

	/* Responsive Design */
	@media (max-width: 480px) {
		.department-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.department-info {
			width: 100%;
		}

		.department-stats {
			justify-content: flex-start;
		}
	}
</style>