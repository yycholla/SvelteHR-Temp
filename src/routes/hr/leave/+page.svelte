<script lang="ts">
    import GenericStreamingPage from '$lib/components/streaming/GenericStreamingPage.svelte';
    import StatCard from '$lib/components/common/StatCard.svelte';
    import StreamingCard from '$lib/components/common/StreamingCard.svelte';
    import TaskList from '$lib/components/common/TaskList.svelte';
    import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-svelte';
    import { hasData } from '$lib/utils/dataTransformers.js';
    import type { PageData } from './$types';

    // Page data from server as fallback
    let { data }: { data: PageData } = $props();

    // Transform server data to fallback format
    const fallbackData = {
        'leave-requests': data.requests || [],
        'leave-balances': data.balances || [],
        'leave-policies': data.policies || [],
        'pending-approvals': data.pending || []
    };
</script>

<svelte:head>
	<title>HR - Leave Management - SvelteHR</title>
</svelte:head>

<GenericStreamingPage 
    configKey="leave" 
    title="Leave Management"
    fallbackData={fallbackData}
>
    <div slot="streaming" let:data={streamingData}>
        <div class="hr-leave-content">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Requests" value={Array.isArray(streamingData['leave-requests']) ? streamingData['leave-requests'].length : 0} icon={Calendar} tag="#hr" href="/hr/leave" loading={!hasData(streamingData['leave-requests'])} />
                <StatCard title="Leave Balances" value={Array.isArray(streamingData['leave-balances']) ? streamingData['leave-balances'].length : 0} icon={Clock} tag="#hr" href="/hr/leave" loading={!hasData(streamingData['leave-balances'])} />
                <StatCard title="Pending Approvals" value={Array.isArray(streamingData['pending-approvals']) ? streamingData['pending-approvals'].length : 0} icon={AlertCircle} tag="#hr" href="/hr/leave" loading={!hasData(streamingData['pending-approvals'])} />
                <StatCard title="Policies" value={Array.isArray(streamingData['leave-policies']) ? streamingData['leave-policies'].length : 0} icon={CheckCircle} tag="#hr" href="/hr/leave" loading={!hasData(streamingData['leave-policies'])} />
            </div>

            <StreamingCard
                title="Leave Requests"
                description="Recent leave requests"
                icon={Calendar}
                tag="#hr"
                href="/hr/leave"
                loading={!hasData(streamingData['leave-requests'])}
                empty={!Array.isArray(streamingData['leave-requests']) || streamingData['leave-requests'].length === 0}
                emptyMessage="No recent leave requests"
            >
                {#snippet children()}
                    <div class="leave-grid">
                        {#each (Array.isArray(streamingData['leave-requests']) ? streamingData['leave-requests'] : []) as request}
                            <div class="leave-card">
                                <div class="leave-header">
                                    <h4>{request.employee?.firstName} {request.employee?.lastName}</h4>
                                    <div class="status-badge {request.status?.toLowerCase() || 'pending'}">
                                        {request.status || 'Pending'}
                                    </div>
                                </div>
                                <div class="leave-details">
                                    <p class="leave-type">{request.leaveType || 'General Leave'}</p>
                                    <p class="leave-dates">
                                        {new Date(request.startDate).toLocaleDateString()} - 
                                        {new Date(request.endDate).toLocaleDateString()}
                                    </p>
                                    {#if request.reason}
                                        <p class="leave-reason">{request.reason}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/snippet}
            </StreamingCard>
        </div>
    </div>

    <div slot="static" let:data={fallbackData}>
        <div class="static-content">
            <div class="text-center py-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <StatCard title="Total Requests" value={Array.isArray(fallbackData['leave-requests']) ? fallbackData['leave-requests'].length : 0} icon={Calendar} tag="#hr" />
                    <StatCard title="Leave Balances" value={Array.isArray(fallbackData['leave-balances']) ? fallbackData['leave-balances'].length : 0} icon={Clock} tag="#hr" />
                    <StatCard title="Pending Approvals" value={Array.isArray(fallbackData['pending-approvals']) ? fallbackData['pending-approvals'].length : 0} icon={AlertCircle} tag="#hr" />
                    <StatCard title="Policies" value={Array.isArray(fallbackData['leave-policies']) ? fallbackData['leave-policies'].length : 0} icon={CheckCircle} tag="#hr" />
                </div>
            </div>
        </div>
    </div>

    <div slot="fallback">
        <div class="fallback-content text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Loading Leave Data</h3>
            <p class="text-gray-500">Please wait while we fetch leave information...</p>
        </div>
    </div>
</GenericStreamingPage>

<style>
	.hr-leave-content {
		max-width: 1400px;
		margin: 0 auto;
	}

    /* Removed bespoke stat/leave card styles in favor of modular components */

    /* Removed unused legacy leave-section styles */

	.leave-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1rem;
	}

	.leave-card {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.leave-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.leave-header h4 {
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		flex: 1;
	}

	.leave-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.leave-type {
		font-weight: 500;
		color: #4f46e5;
		margin: 0;
	}

	.leave-dates {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
	}

	.leave-reason {
		color: #374151;
		font-size: 0.875rem;
		margin: 0;
		font-style: italic;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.status-badge.approved {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.pending {
		background: #fef3c7;
		color: #d97706;
	}

	.status-badge.rejected {
		background: #fee2e2;
		color: #dc2626;
	}

	.loading-state {
		margin-top: 1rem;
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1rem;
	}

	.skeleton-card {
		height: 140px;
		background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 8px;
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.static-content {
		text-align: center;
		padding: 2rem;
	}

	.fallback-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
	}
</style>