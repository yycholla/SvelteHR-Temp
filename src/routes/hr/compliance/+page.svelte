<script lang="ts">
	import StatCard from '$lib/components/common/StatCard.svelte';
	import {
		Shield,
		AlertCircle,
		CheckCircle,
		Clock,
		FileText,
		Upload,
		Users,
		Plus,
		Edit,
		Eye,
		Trash2
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Transform server data for display
	const stats = {
		totalItems: data.complianceItems?.length || 0,
		totalActive: data.stats?.totalActive || 0,
		expiringSoon: data.stats?.expiringSoon || 0,
		documents: data.documents?.length || 0
	};

	// CRUD Operations for Compliance Items
	function handleCreateComplianceItem() {
		// For now, use a simple prompt-based input - can be enhanced with modal later
		const title = prompt('Enter compliance item title:');
		const itemType = prompt('Enter item type (e.g. Training, Certification, Policy):') || 'General';

		if (title) {
			// Make API call to create compliance item
			createComplianceItem({ title, itemType, status: 'Pending' });
		}
	}

	function handleViewComplianceItem(item: any) {
		alert(
			`Compliance Item: ${item.title}\nType: ${item.itemType}\nStatus: ${item.status}\nDue Date: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not set'}`
		);
	}

	function handleEditComplianceItem(item: any) {
		const newTitle = prompt('Edit title:', item.title);
		const newStatus = prompt('Edit status (Pending, Active, Completed, Expired):', item.status);

		if (newTitle && newStatus) {
			updateComplianceItem(item.id, { title: newTitle, status: newStatus });
		}
	}

	async function handleDeleteComplianceItem(item: any) {
		if (confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
			try {
				const response = await fetch(`/api/v2/compliance-items/${item.id}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.ok) {
					console.log('✅ Compliance item deleted successfully');
					await invalidateAll();
				} else {
					const error = await response.text();
					alert(`Failed to delete compliance item: ${error}`);
				}
			} catch (error) {
				console.error('Delete error:', error);
				alert('Failed to delete compliance item. Please try again.');
			}
		}
	}

	async function createComplianceItem(itemData: any) {
		try {
			const response = await fetch('/api/v2/compliance-items', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(itemData)
			});

			if (response.ok) {
				console.log('✅ Compliance item created successfully');
				await invalidateAll();
			} else {
				const error = await response.text();
				alert(`Failed to create compliance item: ${error}`);
			}
		} catch (error) {
			console.error('Create error:', error);
			alert('Failed to create compliance item. Please try again.');
		}
	}

	async function updateComplianceItem(itemId: string, updateData: any) {
		try {
			const response = await fetch(`/api/v2/compliance-items/${itemId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updateData)
			});

			if (response.ok) {
				console.log('✅ Compliance item updated successfully');
				await invalidateAll();
			} else {
				const error = await response.text();
				alert(`Failed to update compliance item: ${error}`);
			}
		} catch (error) {
			console.error('Update error:', error);
			alert('Failed to update compliance item. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>HR - Compliance Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Compliance Management</h1>
		<p class="text-gray-600 dark:text-gray-400">
			Monitor and manage organizational compliance requirements
		</p>
	</div>

	<!-- Stats Overview -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
		<StatCard title="Documents" value={stats.documents} icon={FileText} tag="#hr" loading={false} />
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Compliance Items -->
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-6 flex items-center gap-2">
				<Shield class="h-5 w-5 text-blue-600" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Compliance Items</h2>
			</div>

			{#if stats.totalItems === 0}
				<div class="py-8 text-center">
					<Shield class="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<p class="text-gray-500">No compliance items found</p>
				</div>
			{:else}
				<div class="compliance-grid">
					{#each data.complianceItems || [] as item}
						<div class="compliance-card">
							<h4>{item.title || 'Compliance Item'}</h4>
							<p class="item-type">{item.itemType || 'General'}</p>
							{#if item.employee}
								<p class="employee-name">
									<Users class="mr-1 inline h-4 w-4" />
									{item.employee.first_name}
									{item.employee.last_name}
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
		<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
			<div class="mb-6 flex items-center gap-2">
				<FileText class="h-5 w-5 text-green-600" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Document Library</h2>
			</div>

			{#if stats.documents === 0}
				<div class="py-8 text-center">
					<FileText class="mx-auto mb-4 h-12 w-12 text-gray-400" />
					<p class="text-gray-500">No documents available</p>
				</div>
			{:else}
				<div class="documents-grid">
					{#each (data.documents || []).slice(0, 10) as doc}
						<div class="document-card">
							<div class="doc-header">
								<FileText class="h-5 w-5 text-blue-600" />
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
						<Upload class="h-4 w-4" />
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
