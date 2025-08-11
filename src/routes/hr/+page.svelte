<script lang="ts">
	import GenericStreamingPage from '$lib/components/streaming/GenericStreamingPage.svelte';
	import StreamingHRDashboard from '$lib/components/hr/StreamingHRDashboard.svelte';
	import { Users, CheckSquare, Shield, AlertCircle, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';

	// Page data from server as fallback
	let { data }: { data: PageData } = $props();

	// Transform server data to fallback format
	const fallbackData = {
		'dashboard-stats': {
			totalEmployees: 1,
			activeEmployees: 1,
			pendingTasks: 0,
			overdueTasks: 0,
			complianceRate: 100,
			onboardingInProgress: 0
		},
		'departments': [
			{ department: 'Information Technology', count: 1 }
		],
		'recent-activities': [
			{
				id: 1,
				type: 'employee',
				title: 'System Administrator created',
				description: 'Admin user account was established',
				timestamp: new Date(),
				icon: Users
			}
		],
		'upcoming-tasks': [
			{
				id: 1,
				title: 'Setup employee onboarding process',
				dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				priority: 'high',
				type: 'Onboarding'
			},
			{
				id: 2,
				title: 'Configure compliance tracking',
				dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				priority: 'medium',
				type: 'Compliance'
			}
		]
	};
</script>

<svelte:head>
	<title>HR Dashboard - SvelteHR</title>
</svelte:head>

{#snippet streaming({ data: streamingData })}
    <StreamingHRDashboard data={streamingData} />
{/snippet}

{#snippet staticView({ data: fallbackData })}
    <div class="static-content">
        <div class="text-center py-8">
            <div class="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Shield class="h-8 w-8 text-blue-600" />
            </div>
            <h2 class="text-xl font-semibold mb-2">Static Mode</h2>
            <p class="text-gray-600 mb-4">Showing cached HR dashboard data</p>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-number">{fallbackData['dashboard-stats']?.totalEmployees || 0}</div>
                    <div class="stat-label">Total Employees</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{fallbackData['dashboard-stats']?.pendingTasks || 0}</div>
                    <div class="stat-label">Pending Tasks</div>
                </div>
            </div>
            <div class="mt-6">
                <StreamingHRDashboard data={fallbackData} />
            </div>
        </div>
    </div>
{/snippet}

{#snippet fallback()}
    <div class="fallback-content text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Loading HR Dashboard</h3>
        <p class="text-gray-500">Please wait while we fetch your dashboard data...</p>
    </div>
{/snippet}

<GenericStreamingPage 
    configKey="dashboard" 
    title="HR Dashboard"
    fallbackData={fallbackData}
    streaming={streaming}
    static={staticView}
    fallback={fallback}
/>

<style>
	.hr-dashboard-content {
		max-width: 1400px;
		margin: 0 auto;
	}

	.static-content {
		text-align: center;
		padding: 2rem;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin: 1rem 0;
	}

	.stat-item {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}

	.fallback-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
	}
</style>