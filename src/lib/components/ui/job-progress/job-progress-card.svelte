<script lang="ts" module>
	import { tv } from "tailwind-variants";
	import { cn } from "$lib/utils.js";

	export const jobProgressCardVariants = tv({
		base: "rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md",
		variants: {
			status: {
				pending: "border-l-4 border-l-muted-foreground",
				running: "border-l-4 border-l-blue-500 bg-blue-50/10 dark:bg-blue-950/10",
				completed: "border-l-4 border-l-green-500 bg-green-50/10 dark:bg-green-950/10",
				failed: "border-l-4 border-l-red-500 bg-red-50/10 dark:bg-red-950/10",
				cancelled: "border-l-4 border-l-gray-500 bg-gray-50/10 dark:bg-gray-950/10",
			}
		},
		defaultVariants: {
			status: "pending",
		},
	});

	export type JobProgressCardProps = {
		job: import('./job-progress-dashboard.svelte').BackgroundJob;
		onCancel?: (jobId: string) => void;
		onRetry?: (jobId: string) => void;
		onView?: (job: import('./job-progress-dashboard.svelte').BackgroundJob) => void;
		class?: string;
	};
</script>

<script lang="ts">
	import { 
		Play, 
		CheckCircle, 
		XCircle, 
		AlertCircle, 
		Clock,
		X,
		RotateCcw,
		Eye,
		FileText,
		Upload,
		Download,
		Database,
		Shield,
		Mail
	} from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Progress from '../progress/progress.svelte';
	import Badge from '../badge/badge.svelte';
	import type { BackgroundJob, JobType } from './job-progress-dashboard.svelte';
	import { formatDistanceToNow } from 'date-fns';

	let {
		job,
		onCancel,
		onRetry,
		onView,
		class: className,
	}: JobProgressCardProps = $props();

	function getJobTypeIcon(type: JobType) {
		switch (type) {
			case 'report':
				return FileText;
			case 'bulk_import':
				return Upload;
			case 'bulk_update':
				return Database;
			case 'export':
				return Download;
			case 'compliance_check':
				return Shield;
			case 'notification':
				return Mail;
			default:
				return FileText;
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'pending':
				return Clock;
			case 'running':
				return Play;
			case 'completed':
				return CheckCircle;
			case 'failed':
				return XCircle;
			case 'cancelled':
				return AlertCircle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'text-muted-foreground';
			case 'running':
				return 'text-blue-600 dark:text-blue-400';
			case 'completed':
				return 'text-green-600 dark:text-green-400';
			case 'failed':
				return 'text-red-600 dark:text-red-400';
			case 'cancelled':
				return 'text-gray-600 dark:text-gray-400';
		}
	}

	function getPriorityBadgeVariant(priority: string) {
		switch (priority) {
			case 'urgent':
				return 'destructive' as const;
			case 'high':
				return 'default' as const;
			case 'normal':
				return 'secondary' as const;
			case 'low':
				return 'outline' as const;
		}
	}

	function getProgressVariant(status: string) {
		switch (status) {
			case 'completed':
				return 'success' as const;
			case 'failed':
				return 'destructive' as const;
			case 'running':
				return 'default' as const;
			default:
				return 'default' as const;
		}
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}
</script>

<div class={cn(jobProgressCardVariants({ status: job.status }), className)}>
	<!-- Header -->
	<div class="flex items-start justify-between mb-3">
		<div class="flex items-center gap-3">
			{#snippet typeIcon()}
				{@const TypeIcon = getJobTypeIcon(job.type)}
				<TypeIcon class="h-4 w-4 text-muted-foreground" />
			{/snippet}
			<div class="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
				{@render typeIcon()}
			</div>
			
			<div class="min-w-0">
				<h4 class="font-medium text-sm truncate">{job.title}</h4>
				<div class="flex items-center gap-2 mt-1">
					{#snippet statusIcon()}
						{@const StatusIcon = getStatusIcon(job.status)}
						<StatusIcon class="h-3 w-3 {getStatusColor(job.status)}" />
					{/snippet}
					{@render statusIcon()}
					<span class="text-xs text-muted-foreground capitalize">{job.status}</span>
					<Badge variant={getPriorityBadgeVariant(job.priority)} class="text-xs">
						{job.priority}
					</Badge>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-1 flex-shrink-0">
			{#if job.status === 'running' && job.canCancel && onCancel}
				<Button
					variant="ghost"
					size="icon"
					onclick={() => onCancel?.(job.id)}
					class="h-7 w-7"
					title="Cancel job"
				>
					<X class="h-3 w-3" />
				</Button>
			{/if}

			{#if job.status === 'failed' && job.canRetry && onRetry}
				<Button
					variant="ghost"
					size="icon"
					onclick={() => onRetry?.(job.id)}
					class="h-7 w-7"
					title="Retry job"
				>
					<RotateCcw class="h-3 w-3" />
				</Button>
			{/if}

			{#if (job.status === 'completed' || job.status === 'failed') && onView}
				<Button
					variant="ghost"
					size="icon"
					onclick={() => onView?.(job)}
					class="h-7 w-7"
					title="View details"
				>
					<Eye class="h-3 w-3" />
				</Button>
			{/if}
		</div>
	</div>

	<!-- Description -->
	{#if job.description}
		<p class="text-xs text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
	{/if}

	<!-- Progress -->
	{#if job.status === 'running' || (job.status === 'completed' && job.progress === 100)}
		<div class="space-y-2 mb-3">
			<Progress 
				value={job.progress} 
				variant={getProgressVariant(job.status)}
				class="h-2"
			/>
			
			<!-- Step Info -->
			{#if job.status === 'running'}
				<div class="flex items-center justify-between text-xs text-muted-foreground">
					<div class="flex items-center gap-2">
						{#if job.totalSteps && job.currentStep}
							<span>Step {job.currentStep}/{job.totalSteps}</span>
						{/if}
						
						{#if job.stepDescription}
							<span>{job.stepDescription}</span>
						{/if}
					</div>
					
					<span class="font-medium">{job.progress}%</span>
				</div>
				
				{#if job.timeRemaining}
					<p class="text-xs text-muted-foreground">
						{formatDuration(job.timeRemaining)} remaining
					</p>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Footer Info -->
	<div class="flex items-center justify-between text-xs text-muted-foreground">
		<div>
			{#if job.status === 'completed' && job.completedAt}
				Completed {formatDistanceToNow(job.completedAt, { addSuffix: true })}
			{:else if job.status === 'failed' && job.error}
				<span class="text-red-600 dark:text-red-400">Error: {job.error}</span>
			{:else}
				Created {formatDistanceToNow(job.createdAt, { addSuffix: true })}
			{/if}
		</div>
		
		{#if job.estimatedDuration && job.status === 'pending'}
			<span>~{formatDuration(job.estimatedDuration)}</span>
		{/if}
	</div>
</div>