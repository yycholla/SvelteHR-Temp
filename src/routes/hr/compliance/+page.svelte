<script lang="ts">
    import GenericStreamingPage from '$lib/components/streaming/GenericStreamingPage.svelte';
    import StatCard from '$lib/components/common/StatCard.svelte';
    import StreamingCard from '$lib/components/common/StreamingCard.svelte';
    import TaskList from '$lib/components/common/TaskList.svelte';
    import ActivityFeed from '$lib/components/common/ActivityFeed.svelte';
    import { Shield, AlertCircle, CheckCircle, Clock } from 'lucide-svelte';
    import { transformActivityData, hasData } from '$lib/utils/dataTransformers.js';
    import type { PageData } from './$types';

    // Page data from server as fallback
    let { data }: { data: PageData } = $props();

    // Transform server data to fallback format
    const fallbackData = {
        'compliance-items': data.items || [],
        'compliance-stats': { total: data.stats?.total || 0 },
        'expiring-items': data.expiring || [],
        'categories': data.categories || []
    };
</script>

<svelte:head>
	<title>HR - Compliance Management - SvelteHR</title>
</svelte:head>

<GenericStreamingPage 
    configKey="compliance" 
    title="Compliance Management"
    fallbackData={fallbackData}
>
    <div slot="streaming" let:data={streamingData}>
        <div class="hr-compliance-content">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Items" value={Array.isArray(streamingData['compliance-items']) ? streamingData['compliance-items'].length : 0} icon={Shield} tag="#hr" href="/hr/compliance" loading={!hasData(streamingData['compliance-items'])} />
                <StatCard title="Compliance Stats" value={streamingData['compliance-stats']?.total || 0} icon={CheckCircle} tag="#hr" href="/hr/compliance" loading={!hasData(streamingData['compliance-stats'])} />
                <StatCard title="Expiring Soon" value={Array.isArray(streamingData['expiring-items']) ? streamingData['expiring-items'].length : 0} icon={Clock} tag="#hr" href="/hr/compliance" loading={!hasData(streamingData['expiring-items'])} />
                <StatCard title="Categories" value={Array.isArray(streamingData['categories']) ? streamingData['categories'].length : 0} icon={AlertCircle} tag="#hr" href="/hr/compliance" loading={!hasData(streamingData['categories'])} />
            </div>

            <StreamingCard
                title="Compliance Overview"
                description="Active compliance items"
                icon={Shield}
                tag="#hr"
                href="/hr/compliance"
                loading={!hasData(streamingData['compliance-items'])}
                empty={!Array.isArray(streamingData['compliance-items']) || streamingData['compliance-items'].length === 0}
                emptyMessage="No compliance items"
            >
                {#snippet children()}
                    <div class="compliance-grid">
                        {#each (Array.isArray(streamingData['compliance-items']) ? streamingData['compliance-items'] : []) as item}
                            <div class="compliance-card">
                                <h4>{item.title || 'Compliance Item'}</h4>
                                <p class="item-type">{item.itemType || 'General'}</p>
                                {#if item.dueDate}
                                    <p class="due-date">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                                {/if}
                                <div class="status-badge {item.status?.toLowerCase() || 'pending'}">
                                    {item.status || 'Pending'}
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
                    <StatCard title="Total Items" value={Array.isArray(fallbackData['compliance-items']) ? fallbackData['compliance-items'].length : 0} icon={Shield} tag="#hr" />
                    <StatCard title="Compliance Stats" value={fallbackData['compliance-stats']?.total || 0} icon={CheckCircle} tag="#hr" />
                    <StatCard title="Expiring Soon" value={Array.isArray(fallbackData['expiring-items']) ? fallbackData['expiring-items'].length : 0} icon={Clock} tag="#hr" />
                    <StatCard title="Categories" value={Array.isArray(fallbackData['categories']) ? fallbackData['categories'].length : 0} icon={AlertCircle} tag="#hr" />
                </div>
            </div>
        </div>
    </div>

    <div slot="fallback">
        <div class="fallback-content text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Loading Compliance Data</h3>
            <p class="text-gray-500">Please wait while we fetch compliance information...</p>
        </div>
    </div>
</GenericStreamingPage>

<style>
	.hr-compliance-content {
		max-width: 1400px;
		margin: 0 auto;
	}

    /* Removed bespoke stat/compliance card styles in favor of modular components */

	.compliance-section {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

    /* Removed unused legacy compliance-section styles */

	.compliance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.compliance-card {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.compliance-card h4 {
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.item-type {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0 0 0.5rem 0;
	}

	.due-date {
		color: #9b9b9b;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.active {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.pending {
		background: #fef3c7;
		color: #d97706;
	}

	.status-badge.expired {
		background: #fee2e2;
		color: #dc2626;
	}

	.loading-state {
		margin-top: 1rem;
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.skeleton-card {
		height: 120px;
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