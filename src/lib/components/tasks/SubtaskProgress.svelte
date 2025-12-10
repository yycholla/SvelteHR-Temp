<!--
  SubtaskProgress Component
  Feature: 028-task-system-expansion - Task T033
  
  Progress visualization widget for subtask completion metrics
  - Visual progress bars showing completion percentage
  - Subtask breakdown by status (Completed, In Progress, Not Started, Blocked, Cancelled)
  - Circular progress indicators
  - Statistics display (X of Y completed)
  - Support for nested subtask aggregation
  - On-track/behind-schedule indicators based on due dates
-->

<script lang="ts">
	import type { Task, TaskStatus } from '$lib/types/task';
	import { Badge } from '$lib/components/ui/badge';
	import {
		AlertCircle,
		CheckCircle,
		Circle,
		Clock,
		Minus,
		Target,
		TrendingDown,
		TrendingUp,
		XCircle
	} from '@lucide/svelte';
	import { differenceInDays, isAfter } from 'date-fns';

	interface Props {
		task: Task; // Task with populated subtasks
		showDetails?: boolean; // Show detailed breakdown
		compact?: boolean; // Compact display mode
		showOnTrack?: boolean; // Show on-track indicator
	}

	const { task, showDetails = true, compact = false, showOnTrack = true }: Props = $props();

	// Calculate subtask statistics
	interface SubtaskStats {
		total: number;
		completed: number;
		inProgress: number;
		notStarted: number;
		blocked: number;
		cancelled: number;
		completionPercentage: number;
	}

	const subtaskStats = $derived(
		((): SubtaskStats => {
			const subtasks = task.subtasks || [];
			const total = subtasks.length;

			if (total === 0) {
				return {
					total: 0,
					completed: 0,
					inProgress: 0,
					notStarted: 0,
					blocked: 0,
					cancelled: 0,
					completionPercentage: 0
				};
			}

			// NOTE: Rust GraphQL returns enum values in PascalCase
			const completed = subtasks.filter((t: Task) => t.status === 'Done').length;
			const inProgress = subtasks.filter((t: Task) => t.status === 'InProgress').length;
			const notStarted = subtasks.filter((t: Task) => t.status === 'Todo').length;
			const blocked = subtasks.filter((t: Task) => t.status === 'Blocked').length;
			const cancelled = subtasks.filter((t: Task) => t.status === 'Cancelled').length;

			const completionPercentage = Math.round((completed / total) * 100);

			return {
				total,
				completed,
				inProgress,
				notStarted,
				blocked,
				cancelled,
				completionPercentage
			};
		})()
	);

	// Calculate if task is on track based on due date
	interface OnTrackStatus {
		isOnTrack: boolean;
		daysRemaining: number | null;
		expectedProgress: number;
		actualProgress: number;
	}

	const onTrackStatus = $derived(
		((): OnTrackStatus | null => {
			if (!showOnTrack || !task.dueDate) return null;

			const now = new Date();
			const dueDate = new Date(task.dueDate);
			const createdDate = new Date(task.createdAt);

			// Check if past due date
			if (isAfter(now, dueDate)) {
				return {
					isOnTrack: subtaskStats.completionPercentage === 100,
					daysRemaining: 0,
					expectedProgress: 100,
					actualProgress: subtaskStats.completionPercentage
				};
			}

			const daysRemaining = differenceInDays(dueDate, now);
			const totalDays = differenceInDays(dueDate, createdDate);
			const daysElapsed = totalDays - daysRemaining;

			// Calculate expected progress (linear)
			const expectedProgress = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
			const actualProgress = subtaskStats.completionPercentage;

			// Consider on track if within 10% of expected progress
			const isOnTrack = actualProgress >= expectedProgress - 10;

			return {
				isOnTrack,
				daysRemaining,
				expectedProgress,
				actualProgress
			};
		})()
	);

	// Status configuration
	// NOTE: Keys must match the property names in SubtaskStats interface
	const statusConfig = {
		completed: {
			label: 'Completed',
			icon: CheckCircle,
			color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
			textColor: 'text-green-600 dark:text-green-400'
		},
		inProgress: {
			label: 'In Progress',
			icon: Circle,
			color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
			textColor: 'text-blue-600 dark:text-blue-400'
		},
		notStarted: {
			label: 'Not Started',
			icon: Clock,
			color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
			textColor: 'text-amber-600 dark:text-amber-400'
		},
		blocked: {
			label: 'Blocked',
			icon: AlertCircle,
			color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
			textColor: 'text-red-600 dark:text-red-400'
		},
		cancelled: {
			label: 'Deferred',
			icon: XCircle,
			color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
			textColor: 'text-gray-500 dark:text-gray-400'
		}
	};

	// Get progress bar color
	function getProgressColor(percentage: number): string {
		if (percentage === 100) return 'bg-green-500';
		if (percentage >= 75) return 'bg-blue-500';
		if (percentage >= 50) return 'bg-amber-500';
		if (percentage >= 25) return 'bg-orange-500';
		return 'bg-red-500';
	}

	// Check if task has subtasks
	const hasSubtasks = $derived(subtaskStats.total > 0);
</script>

<div class="subtask-progress" class:compact>
	{#if !hasSubtasks}
		<!-- No Subtasks State -->
		<div class="no-subtasks-state">
			<Minus class="h-4 w-4 text-muted-foreground" />
			<span class="text-sm text-muted-foreground">No subtasks</span>
		</div>
	{:else}
		<!-- Progress Display -->
		<div class="progress-container">
			<!-- Header with Stats -->
			<div class="progress-header">
				<div class="flex items-center gap-2">
					<Target class="h-4 w-4 text-primary" />
					<span class="text-sm font-medium">
						{subtaskStats.completed} of {subtaskStats.total} completed
					</span>
				</div>
				<Badge variant={subtaskStats.completionPercentage === 100 ? 'default' : 'secondary'}>
					{subtaskStats.completionPercentage}%
				</Badge>
			</div>

			<!-- Progress Bar -->
			<div class="progress-bar-container">
				<div class="progress-bar-track">
					<div
						class="progress-bar-fill {getProgressColor(subtaskStats.completionPercentage)}"
						style="width: {subtaskStats.completionPercentage}%"
					></div>
				</div>
			</div>

			<!-- On-Track Indicator -->
			{#if onTrackStatus && showOnTrack}
				<div class="on-track-indicator">
					{#if onTrackStatus.isOnTrack}
						<div class="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
							<TrendingUp class="h-3 w-3" />
							<span>On track</span>
							{#if onTrackStatus.daysRemaining !== null && onTrackStatus.daysRemaining > 0}
								<span class="text-muted-foreground">
									({onTrackStatus.daysRemaining}
									{onTrackStatus.daysRemaining === 1 ? 'day' : 'days'} remaining)
								</span>
							{/if}
						</div>
					{:else}
						<div class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
							<TrendingDown class="h-3 w-3" />
							<span>Behind schedule</span>
							{#if onTrackStatus.daysRemaining === 0}
								<span class="text-muted-foreground">(Overdue)</span>
							{:else if onTrackStatus.daysRemaining !== null}
								<span class="text-muted-foreground">
									({Math.abs(onTrackStatus.expectedProgress - onTrackStatus.actualProgress)}%
									behind)
								</span>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Detailed Status Breakdown -->
			{#if showDetails && !compact}
				<div class="status-breakdown">
					{#each Object.entries(statusConfig) as [status, config]}
						{@const count =
							subtaskStats[status.toLowerCase().replace(' ', '') as keyof SubtaskStats]}
						{#if typeof count === 'number' && count > 0}
							{@const StatusIcon = config.icon}
							<div class="status-item">
								<div class="flex items-center gap-2 flex-1">
									<div class="status-icon {config.color}">
										<StatusIcon class="h-3 w-3" />
									</div>
									<span class="text-xs text-muted-foreground">{config.label}</span>
								</div>
								<span class="text-xs font-medium {config.textColor}">{count}</span>
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			<!-- Compact Mode Summary -->
			{#if compact}
				<div class="compact-summary">
					<span class="text-xs text-muted-foreground">
						{subtaskStats.inProgress > 0 ? `${subtaskStats.inProgress} in progress` : ''}
						{subtaskStats.inProgress > 0 && subtaskStats.notStarted > 0 ? ', ' : ''}
						{subtaskStats.notStarted > 0 ? `${subtaskStats.notStarted} not started` : ''}
						{subtaskStats.blocked > 0 ? `, ${subtaskStats.blocked} blocked` : ''}
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
