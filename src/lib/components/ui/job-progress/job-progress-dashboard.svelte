<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	import { cn } from '$lib/utils.js';

	export const jobProgressDashboardVariants = tv({
		base: 'w-full rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm',
		variants: {
			variant: {
				default: 'bg-card/50',
				compact: 'bg-transparent border-0 shadow-none',
				floating: 'fixed bottom-4 right-4 w-96 z-50 shadow-2xl bg-background/95 backdrop-blur-md'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export const jobItemVariants = tv({
		base: 'flex items-center gap-4 p-4 rounded-lg transition-all duration-200',
		variants: {
			status: {
				pending: 'bg-muted/20',
				running:
					'bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/50',
				completed:
					'bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/50',
				failed: 'bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/50',
				cancelled:
					'bg-gray-50/50 dark:bg-gray-950/10 border border-gray-200/50 dark:border-gray-800/50'
			}
		},
		defaultVariants: {
			status: 'pending'
		}
	});

	export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';
	export type JobType =
		| 'report'
		| 'bulk_import'
		| 'bulk_update'
		| 'data_archival'
		| 'compliance_check'
		| 'notification'
		| 'export';

	export interface BackgroundJob {
		id: string;
		type: JobType;
		title: string;
		description?: string;
		status: JobStatus;
		priority: JobPriority;
		progress: number; // 0-100
		createdAt: Date;
		startedAt?: Date;
		completedAt?: Date;
		totalSteps?: number;
		currentStep?: number;
		stepDescription?: string;
		result?: any;
		error?: string;
		estimatedDuration?: number; // in seconds
		timeRemaining?: number; // in seconds
		canCancel?: boolean;
		canRetry?: boolean;
	}

	export type JobProgressDashboardVariant = VariantProps<
		typeof jobProgressDashboardVariants
	>['variant'];

	export type JobProgressDashboardProps = {
		jobs: BackgroundJob[];
		variant?: JobProgressDashboardVariant;
		showCompleted?: boolean;
		maxItems?: number;
		onCancel?: (jobId: string) => void;
		onRetry?: (jobId: string) => void;
		onView?: (job: BackgroundJob) => void;
		onClearCompleted?: () => void;
		class?: string;
	};
</script>

<script lang="ts">
	import {
		Play,
		Pause,
		CheckCircle,
		XCircle,
		AlertCircle,
		Clock,
		FileText,
		Upload,
		Download,
		Database,
		Shield,
		Mail,
		X,
		RotateCcw,
		Eye,
		Trash2
	} from 'lucide-svelte';
	import Button from '../button/button.svelte';
	import Progress from '../progress/progress.svelte';
	import Badge from '../badge/badge.svelte';
	import Separator from '../separator/separator.svelte';
	import { formatDistanceToNow, format } from 'date-fns';

	let {
		jobs,
		variant = 'default',
		showCompleted = true,
		maxItems = 10,
		onCancel,
		onRetry,
		onView,
		onClearCompleted,
		class: className
	}: JobProgressDashboardProps = $props();

	const filteredJobs = $derived(() => {
		let filtered = showCompleted ? jobs : jobs.filter((job) => job.status !== 'completed');

		// Sort by priority and creation time
		filtered.sort((a, b) => {
			const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
			const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
			if (priorityDiff !== 0) return priorityDiff;

			return b.createdAt.getTime() - a.createdAt.getTime();
		});

		return filtered.slice(0, maxItems);
	});

	const activeJobs = $derived(jobs.filter((job) => job.status === 'running').length);
	const completedJobs = $derived(jobs.filter((job) => job.status === 'completed').length);
	const failedJobs = $derived(jobs.filter((job) => job.status === 'failed').length);

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

	function getStatusIcon(status: JobStatus) {
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

	function getStatusColor(status: JobStatus) {
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

	function getPriorityBadgeVariant(priority: JobPriority) {
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

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}

	function getProgressVariant(status: JobStatus) {
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
</script>

<div class={cn(jobProgressDashboardVariants({ variant }), className)}>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border/40 p-4">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
				<h3 class="font-semibold">Background Jobs</h3>
			</div>

			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				{#if activeJobs > 0}
					<Badge variant="secondary" class="text-xs">
						{activeJobs} active
					</Badge>
				{/if}

				{#if completedJobs > 0}
					<Badge variant="outline" class="text-xs text-green-600">
						{completedJobs} completed
					</Badge>
				{/if}

				{#if failedJobs > 0}
					<Badge variant="destructive" class="text-xs">
						{failedJobs} failed
					</Badge>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if showCompleted && completedJobs > 0}
				<Button variant="ghost" size="sm" onclick={onClearCompleted} class="text-xs">
					<Trash2 class="mr-1 h-3 w-3" />
					Clear completed
				</Button>
			{/if}
		</div>
	</div>

	<!-- Jobs List -->
	<div class="divide-y divide-border/20">
		{#if filteredJobs().length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<Clock class="mb-3 h-8 w-8 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">No background jobs</p>
				<p class="mt-1 text-xs text-muted-foreground">Jobs will appear here when running</p>
			</div>
		{:else}
			{#each filteredJobs() as job (job.id)}
				{@const TypeIcon = getJobTypeIcon(job.type)}
				{@const StatusIcon = getStatusIcon(job.status)}

				<div class={jobItemVariants({ status: job.status })}>
					<!-- Job Type Icon -->
					<div class="flex-shrink-0">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
							<TypeIcon class="h-5 w-5 text-muted-foreground" />
						</div>
					</div>

					<!-- Job Info -->
					<div class="min-w-0 flex-1 space-y-2">
						<div class="flex items-center justify-between">
							<div class="flex min-w-0 items-center gap-2">
								<h4 class="truncate text-sm font-medium">{job.title}</h4>
								<Badge variant={getPriorityBadgeVariant(job.priority)} class="text-xs">
									{job.priority}
								</Badge>
							</div>

							<div class="flex flex-shrink-0 items-center gap-2">
								<StatusIcon class="h-4 w-4 {getStatusColor(job.status)}" />
								<span class="text-xs text-muted-foreground capitalize">{job.status}</span>
							</div>
						</div>

						{#if job.description}
							<p class="line-clamp-1 text-xs text-muted-foreground">{job.description}</p>
						{/if}

						<!-- Progress Bar -->
						{#if job.status === 'running' || (job.status === 'completed' && job.progress === 100)}
							<Progress
								value={job.progress}
								variant={getProgressVariant(job.status)}
								class="h-1.5"
							/>
						{/if}

						<!-- Job Details -->
						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<div class="flex items-center gap-4">
								<!-- Progress Info -->
								{#if job.status === 'running'}
									{#if job.totalSteps && job.currentStep}
										<span>Step {job.currentStep} of {job.totalSteps}</span>
									{/if}

									{#if job.stepDescription}
										<span>• {job.stepDescription}</span>
									{/if}

									{#if job.timeRemaining}
										<span>• {formatDuration(job.timeRemaining)} remaining</span>
									{/if}
								{:else if job.status === 'completed' && job.completedAt}
									<span>Completed {formatDistanceToNow(job.completedAt, { addSuffix: true })}</span>
								{:else if job.status === 'failed' && job.error}
									<span class="text-red-600 dark:text-red-400">Error: {job.error}</span>
								{:else}
									<span>Created {formatDistanceToNow(job.createdAt, { addSuffix: true })}</span>
								{/if}
							</div>

							<!-- Progress Percentage -->
							{#if job.status === 'running' || job.status === 'completed'}
								<span class="font-medium">{job.progress}%</span>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					<div class="flex flex-shrink-0 items-center gap-1">
						{#if job.status === 'running' && job.canCancel && onCancel}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onCancel?.(job.id)}
								class="h-8 w-8"
								title="Cancel job"
							>
								<X class="h-4 w-4" />
							</Button>
						{/if}

						{#if job.status === 'failed' && job.canRetry && onRetry}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onRetry?.(job.id)}
								class="h-8 w-8"
								title="Retry job"
							>
								<RotateCcw class="h-4 w-4" />
							</Button>
						{/if}

						{#if (job.status === 'completed' || job.status === 'failed') && onView}
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onView?.(job)}
								class="h-8 w-8"
								title="View details"
							>
								<Eye class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
