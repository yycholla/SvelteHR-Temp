<script lang="ts">
	import { onMount } from 'svelte';
	import JobProgressDashboardComponent from './job-progress-dashboard.svelte';
	import { getMockJobs } from '$lib/hooks/useJobs';
	import type { 
		BackgroundJob, 
		JobProgressDashboardVariant,
		JobProgressDashboardProps 
	} from './job-progress-dashboard.svelte';

	// Props for customization
	let {
		variant = "default",
		showCompleted = false,
		maxItems = 5,
		class: className,
		...props
	}: {
		variant?: JobProgressDashboardVariant;
		showCompleted?: boolean;
		maxItems?: number;
		class?: string;
	} = $props();

	// State for jobs
	let jobs = $state<BackgroundJob[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Use mock data for now since jobs endpoint is not available
	onMount(() => {
		// Use mock data for demo purposes
		jobs = getMockJobs();
		loading = false;
		error = null;
	});

	// Transform jobs to ensure they have required Date objects
	const transformedJobs = $derived(jobs.map(job => ({
		...job,
		createdAt: job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt),
		startedAt: job.startedAt ? (job.startedAt instanceof Date ? job.startedAt : new Date(job.startedAt)) : undefined,
		completedAt: job.completedAt ? (job.completedAt instanceof Date ? job.completedAt : new Date(job.completedAt)) : undefined,
	})));

	// Only show if there are active jobs or recent completed/failed jobs
	const shouldShow = $derived(() => {
		if (loading) return false;
		if (transformedJobs.length === 0) return false;
		
		// Show if there are any active jobs
		if (transformedJobs.some(job => job.status === 'running' || job.status === 'pending')) {
			return true;
		}

		// Show if there are recent completed or failed jobs (within last 5 minutes)
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		return transformedJobs.some(job => 
			(job.status === 'completed' && job.completedAt && job.completedAt > fiveMinutesAgo) ||
			(job.status === 'failed' && job.createdAt > fiveMinutesAgo)
		);
	});

	async function handleCancel(jobId: string) {
		console.log('Cancelling job:', jobId);
		// Mock cancel behavior - remove job from list
		jobs = jobs.filter(job => job.id !== jobId);
	}

	async function handleRetry(jobId: string) {
		console.log('Retrying job:', jobId);
		// Mock retry behavior - update job status
		jobs = jobs.map(job => 
			job.id === jobId 
				? { ...job, status: 'pending' as const, error: undefined }
				: job
		);
	}

	function handleView(job: BackgroundJob) {
		// This could open a modal or navigate to a detailed view
		console.log('Viewing job details:', job);
		// For now, just log the job details
	}

	function handleClearCompleted() {
		// Filter out completed jobs
		jobs = jobs.filter(job => job.status !== 'completed');
	}
</script>

{#if shouldShow()}
	<div class="job-progress-wrapper">
		<JobProgressDashboardComponent 
			jobs={transformedJobs}
			{variant}
			{showCompleted}
			{maxItems}
			onCancel={handleCancel}
			onRetry={handleRetry}
			onView={handleView}
			onClearCompleted={handleClearCompleted}
			class={className}
		/>
	</div>
{/if}

<style>
	.job-progress-wrapper {
		position: relative;
		z-index: 40;
	}
</style>