import { writable, derived } from 'svelte/store';
import { useApi, usePaginatedApi, useMutation } from './useApi';
import type { BackgroundJob } from '$lib/components/ui/job-progress/job-progress-dashboard.svelte';

/**
 * Background Jobs management hooks
 */

// Jobs list hook
export function useJobs() {
	const { data, loading, error, refresh } = useApi<{ jobs: BackgroundJob[] }>('jobs', {
		cacheDuration: 5 * 1000, // Refresh every 5 seconds for real-time updates
		transform: (response) => response
	});

	// Extract jobs array from response - ensure data store exists before deriving
	const jobs = derived(data || writable(null), ($data) => $data?.jobs || []);

	// Poll for updates every 5 seconds when there are active jobs
	let pollInterval: number | undefined;

	function startPolling() {
		if (pollInterval) return; // Already polling

		pollInterval = window.setInterval(() => {
			let currentJobs: BackgroundJob[];
			jobs.subscribe((j) => (currentJobs = j))();

			// Only poll if there are active jobs
			if (
				currentJobs &&
				currentJobs.some((job) => job.status === 'running' || job.status === 'pending')
			) {
				refresh();
			}
		}, 5000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = undefined;
		}
	}

	// Auto-start polling if we're in the browser
	if (typeof window !== 'undefined') {
		startPolling();

		// Cleanup on page unload
		window.addEventListener('beforeunload', stopPolling);
	}

	return {
		jobs,
		loading,
		error,
		refresh,
		startPolling,
		stopPolling
	};
}

// Job creation hook
export function useCreateJob() {
	const createJobMutation = useMutation<any, BackgroundJob>('jobs', 'POST', {
		onSuccess: (data) => {
			console.log('Background job created:', data);
		},
		onError: (error) => {
			console.error('Failed to create background job:', error);
		}
	});

	async function createJob(jobData: {
		type: string;
		title: string;
		description?: string;
		data?: Record<string, any>;
		priority?: 'low' | 'normal' | 'high' | 'urgent';
	}) {
		return createJobMutation.mutate(jobData);
	}

	return {
		...createJobMutation,
		createJob
	};
}

// Job status hook
export function useJobStatus(jobId?: string) {
	const jobStatus = useApi<BackgroundJob>(`jobs/${jobId}`, {
		enabled: !!jobId,
		cacheDuration: 2 * 1000, // Refresh every 2 seconds for active job
		onSuccess: (data) => {
			// Auto-refresh if job is still running
			if (data && (data.status === 'running' || data.status === 'pending')) {
				setTimeout(() => {
					jobStatus.refresh();
				}, 2000);
			}
		}
	});

	return {
		job: jobStatus.data,
		loading: jobStatus.loading,
		error: jobStatus.error,
		refresh: jobStatus.refresh
	};
}

// Job actions hook
export function useJobActions() {
	const cancelJobMutation = useMutation<string, void>('jobs/{id}/cancel', 'POST', {
		onSuccess: () => {
			console.log('Job cancelled successfully');
		},
		onError: (error) => {
			console.error('Failed to cancel job:', error);
		}
	});

	const retryJobMutation = useMutation<string, BackgroundJob>('jobs/{id}/retry', 'POST', {
		onSuccess: () => {
			console.log('Job retried successfully');
		},
		onError: (error) => {
			console.error('Failed to retry job:', error);
		}
	});

	async function cancelJob(jobId: string) {
		return cancelJobMutation.mutate(jobId, { id: jobId });
	}

	async function retryJob(jobId: string) {
		return retryJobMutation.mutate(jobId, { id: jobId });
	}

	return {
		cancelJob,
		retryJob,
		cancelLoading: cancelJobMutation.loading,
		retryLoading: retryJobMutation.loading
	};
}

// Mock job data for development/fallback
export function getMockJobs(): BackgroundJob[] {
	return [
		{
			id: '1',
			type: 'report',
			title: 'Monthly Employee Report',
			description: 'Generating comprehensive employee analytics report',
			status: 'running',
			priority: 'normal',
			progress: 65,
			createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
			startedAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
			totalSteps: 10,
			currentStep: 6,
			stepDescription: 'Processing compliance data',
			estimatedDuration: 300,
			timeRemaining: 105,
			canCancel: true,
			canRetry: false
		},
		{
			id: '2',
			type: 'bulk_update',
			title: 'Employee Data Import',
			description: 'Importing 250 employee records from CSV',
			status: 'completed',
			priority: 'high',
			progress: 100,
			createdAt: new Date(Date.now() - 15 * 60 * 1000),
			startedAt: new Date(Date.now() - 14 * 60 * 1000),
			completedAt: new Date(Date.now() - 10 * 60 * 1000),
			totalSteps: 5,
			currentStep: 5,
			canCancel: false,
			canRetry: false
		},
		{
			id: '3',
			type: 'compliance_check',
			title: 'Compliance Audit',
			description: 'Running automated compliance checks',
			status: 'failed',
			priority: 'urgent',
			progress: 30,
			createdAt: new Date(Date.now() - 20 * 60 * 1000),
			startedAt: new Date(Date.now() - 18 * 60 * 1000),
			error: 'Database connection timeout',
			canCancel: false,
			canRetry: true
		}
	];
}
