<script lang="ts">
    import StatCard from '$lib/components/common/StatCard.svelte';
    import { Shield, AlertCircle, CheckCircle, Clock, FileText, Upload, Users } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    
    // Transform server data for display
    const stats = {
        totalItems: data.complianceItems?.length || 0,
        totalActive: data.stats?.totalActive || 0,
        expiringSoon: data.stats?.expiringSoon || 0,
        documents: data.documents?.length || 0
    };
</script>

<svelte:head>
	<title>HR - Compliance Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Compliance Management</h1>
		<p class="text-gray-600 dark:text-gray-400">Monitor and manage organizational compliance requirements</p>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<StatCard 
			title="Total Items" 
			value={stats.totalItems} 
			icon={Shield} 
			tag="#hr" 
			loading={false} 
		/>
		<StatCard 
			title="Active" 
			value={stats.totalActive} 
			icon={CheckCircle} 
			tag="#hr" 
			loading={false} 
		/>
		<StatCard 
			title="Expiring Soon" 
			value={stats.expiringSoon} 
			icon={Clock} 
			tag="#hr" 
			loading={false} 
		/>
		<StatCard 
			title="Documents" 
			value={stats.documents} 
			icon={FileText} 
			tag="#hr" 
			loading={false} 
		/>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Compliance Items -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<div class="flex items-center gap-2 mb-6">
				<Shield class="w-5 h-5 text-blue-600" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Compliance Items</h2>
			</div>
			
			{#if stats.totalItems === 0}
				<div class="text-center py-8">
					<Shield class="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<p class="text-gray-500">No compliance items found</p>
				</div>
			{:else}
				<div class="compliance-grid">
					{#each (data.complianceItems || []) as item}
						<div class="compliance-card">
							<h4>{item.title || 'Compliance Item'}</h4>
							<p class="item-type">{item.itemType || 'General'}</p>
							{#if item.employee}
								<p class="employee-name">
									<Users class="inline w-4 h-4 mr-1" />
									{item.employee.firstName} {item.employee.lastName}
								</p>
							{/if}
							{#if item.dueDate}
								<p class="due-date">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
							{/if}
							<div class="status-badge {item.status?.toLowerCase() || 'pending'}">
								{item.status || 'Pending'}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Document Library -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<div class="flex items-center gap-2 mb-6">
				<FileText class="w-5 h-5 text-green-600" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Document Library</h2>
			</div>
			
			{#if stats.documents === 0}
				<div class="text-center py-8">
					<FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<p class="text-gray-500">No documents available</p>
				</div>
			{:else}
				<div class="documents-grid">
					{#each (data.documents || []).slice(0, 10) as doc}
						<div class="document-card">
							<div class="doc-header">
								<FileText class="w-5 h-5 text-blue-600" />
								<span class="doc-category">{doc.category}</span>
							</div>
							<h5 class="doc-title">{doc.title}</h5>
							<p class="doc-description">{doc.description || 'No description'}</p>
							{#if doc.isConfidential}
								<span class="confidential-badge">Confidential</span>
							{/if}
						</div>
					{/each}
				</div>
				<div class="mt-4 text-center">
					<button class="btn-secondary inline-flex items-center gap-2">
						<Upload class="w-4 h-4" />
						Upload Document
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.compliance-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
		max-height: 400px;
		overflow-y: auto;
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

	.employee-name {
		color: #4f46e5;
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

	.documents-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.document-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 0.75rem;
	}

	.doc-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.doc-category {
		background: #e0f2fe;
		color: #0369a1;
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.doc-title {
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
	}

	.doc-description {
		color: #64748b;
		font-size: 0.75rem;
		margin: 0;
		line-height: 1.4;
	}

	.confidential-badge {
		display: inline-block;
		background: #fecaca;
		color: #dc2626;
		font-size: 0.625rem;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
		margin-top: 0.5rem;
	}

	.btn-secondary {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		background: #e2e8f0;
		border-color: #94a3b8;
	}
</style>