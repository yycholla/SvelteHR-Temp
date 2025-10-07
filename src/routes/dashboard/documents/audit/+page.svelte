<script lang="ts">
	// Audit log page (Feature 024)
	// Access log viewer for HR/Admin with filtering and export

	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Download, Search } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Svelte 5 state
	let filterDocumentId = $state('');
	let filterUserId = $state('');
	let filterAccessType = $state<string | null>(null);
	let filterDateFrom = $state('');
	let filterDateTo = $state('');

	// Access types
	const accessTypes = ['upload', 'download', 'preview', 'delete'];

	// Handle filter changes
	function applyFilters() {
		const params = new URLSearchParams();

		if (filterDocumentId) params.set('documentId', filterDocumentId);
		if (filterUserId) params.set('userId', filterUserId);
		if (filterAccessType) params.set('accessType', filterAccessType);
		if (filterDateFrom) params.set('dateFrom', filterDateFrom);
		if (filterDateTo) params.set('dateTo', filterDateTo);
		params.set('page', '1'); // Reset to first page

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Clear all filters
	function clearFilters() {
		filterDocumentId = '';
		filterUserId = '';
		filterAccessType = null;
		filterDateFrom = '';
		filterDateTo = '';
		goto('/dashboard/documents/audit', { keepFocus: true, noScroll: true });
	}

	// Handle page change
	function goToPage(page: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', page.toString());
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Export to CSV
	async function exportToCSV() {
		try {
			// TODO: Call export API endpoint
			const params = new URLSearchParams(window.location.search);
			params.set('format', 'csv');

			window.open(`/api/documents/audit/export?${params.toString()}`, '_blank');
		} catch (error) {
			console.error('Export error:', error);
			alert('Failed to export audit log. Please try again.');
		}
	}

	// Derived state
	let totalPages = $derived(Math.ceil(data.totalCount / data.limit));
	let hasLogs = $derived(data.accessLogs.length > 0);
</script>

<svelte:head>
	<title>Document Audit Log | HR System</title>
</svelte:head>

<div class="audit-page">
	<!-- Page header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Document Audit Log</h1>
			<p class="page-description">
				View all document access events with filtering and export capabilities
			</p>
		</div>

		<button class="export-button" onclick={exportToCSV}>
			📊 Export CSV
		</button>
	</div>

	<!-- Filters -->
	<div class="filters-card">
		<div class="filters-grid">
			<div class="filter-group">
				<label for="documentId">Document ID</label>
				<input
					id="documentId"
					type="text"
					placeholder="Filter by document ID..."
					bind:value={filterDocumentId}
				/>
			</div>

			<div class="filter-group">
				<label for="userId">User ID</label>
				<input
					id="userId"
					type="text"
					placeholder="Filter by user ID..."
					bind:value={filterUserId}
				/>
			</div>

			<div class="filter-group">
				<label for="accessType">Access Type</label>
				<select id="accessType" bind:value={filterAccessType}>
					<option value={null}>All Types</option>
					{#each accessTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>

			<div class="filter-group">
				<label for="dateFrom">Date From</label>
				<input
					id="dateFrom"
					type="date"
					bind:value={filterDateFrom}
				/>
			</div>

			<div class="filter-group">
				<label for="dateTo">Date To</label>
				<input
					id="dateTo"
					type="date"
					bind:value={filterDateTo}
				/>
			</div>
		</div>

		<div class="filter-actions">
			<button class="clear-button" onclick={clearFilters}>
				Clear Filters
			</button>
			<button class="apply-button" onclick={applyFilters}>
				Apply Filters
			</button>
		</div>
	</div>

	<!-- Audit log table -->
	<div class="table-card">
		{#if hasLogs}
			<div class="audit-table">
				<div class="table-header">
					<span class="col-timestamp">Timestamp</span>
					<span class="col-document">Document</span>
					<span class="col-user">User</span>
					<span class="col-action">Action</span>
					<span class="col-outcome">Outcome</span>
					<span class="col-ip">IP Address</span>
				</div>

				{#each data.accessLogs as log}
					<div class="table-row">
						<span class="col-timestamp">
							{new Date(log.access_timestamp).toLocaleString()}
						</span>
						<span class="col-document">
							<a href="/dashboard/documents/{log.document_id}" class="document-link">
								{log.document_filename || log.document_id}
							</a>
							{#if log.document_type}
								<span class="file-type">.{log.document_type.toLowerCase()}</span>
							{/if}
						</span>
						<span class="col-user">
							{log.user_email || `User ${log.user_id.substring(0, 8)}...`}
						</span>
						<span class="col-action access-type-{log.access_type}">
							{log.access_type}
						</span>
						<span class="col-outcome outcome-{log.access_outcome}">
							{log.access_outcome}
						</span>
						<span class="col-ip">
							{log.ip_address}
						</span>
					</div>

					{#if log.access_outcome === 'denied' && log.denial_reason}
						<div class="denial-reason">
							⚠️ {log.denial_reason}
						</div>
					{/if}
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="pagination">
					<div class="pagination-info">
						Showing {(data.page - 1) * data.limit + 1}-{Math.min(data.page * data.limit, data.totalCount)} of {data.totalCount}
					</div>

					<div class="pagination-controls">
						<button
							class="page-button"
							onclick={() => goToPage(1)}
							disabled={data.page === 1}
						>
							««
						</button>
						<button
							class="page-button"
							onclick={() => goToPage(data.page - 1)}
							disabled={data.page === 1}
						>
							«
						</button>

						{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
							const startPage = Math.max(1, data.page - 2);
							return startPage + i;
						}).filter(p => p <= totalPages) as page}
							<button
								class="page-button"
								class:active={page === data.page}
								onclick={() => goToPage(page)}
							>
								{page}
							</button>
						{/each}

						<button
							class="page-button"
							onclick={() => goToPage(data.page + 1)}
							disabled={data.page === totalPages}
						>
							»
						</button>
						<button
							class="page-button"
							onclick={() => goToPage(totalPages)}
							disabled={data.page === totalPages}
						>
							»»
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<div class="empty-icon">📋</div>
				<h3>No audit logs found</h3>
				<p>Try adjusting your filters to see more results.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.audit-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 2rem;
	}

	.header-content {
		flex: 1;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.page-description {
		font-size: 1rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.export-button {
		padding: 0.75rem 1.5rem;
		background: hsl(142 76% 36%);
		color: white;
		border: none;
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.export-button:hover {
		background: hsl(142 71% 45%);
	}

	.filters-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
		margin-bottom: 2rem;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.filter-group input,
	.filter-group select {
		padding: 0.5rem;
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		font-size: 0.875rem;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.filter-group input:focus,
	.filter-group select:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 3px hsl(var(--ring) / 0.1);
	}

	.filter-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.clear-button,
	.apply-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.clear-button {
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
	}

	.clear-button:hover {
		background: hsl(var(--accent));
	}

	.apply-button {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.apply-button:hover {
		background: hsl(var(--primary) / 0.9);
	}

	.table-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
	}

	.audit-table {
		width: 100%;
		overflow-x: auto;
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 1.5fr 1fr 1fr 0.8fr 0.8fr 1fr;
		gap: 1rem;
		padding: 0.75rem 1rem;
		align-items: center;
	}

	.table-header {
		background: hsl(var(--muted));
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.5rem;
	}

	.table-row {
		font-size: 0.875rem;
		color: hsl(var(--foreground));
		border-bottom: 1px solid hsl(var(--border));
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.document-link {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
	}

	.document-link:hover {
		text-decoration: underline;
	}

	.file-type {
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
		font-weight: normal;
		margin-left: 0.25rem;
	}

	.access-type-upload {
		color: hsl(var(--primary));
		font-weight: 600;
	}

	.access-type-download {
		color: hsl(142 76% 36%);
		font-weight: 600;
	}

	.access-type-preview {
		color: hsl(271 91% 65%);
		font-weight: 600;
	}

	.access-type-delete {
		color: hsl(var(--destructive));
		font-weight: 600;
	}

	.outcome-success {
		color: hsl(142 76% 36%);
		font-weight: 600;
	}

	.outcome-denied {
		color: hsl(var(--destructive));
		font-weight: 600;
	}

	.denial-reason {
		grid-column: 1 / -1;
		padding: 0.5rem 1rem;
		background: hsl(var(--destructive) / 0.1);
		border-left: 3px solid hsl(var(--destructive));
		font-size: 0.875rem;
		color: hsl(var(--destructive));
		margin-bottom: 0.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: hsl(var(--muted-foreground));
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		font-size: 0.875rem;
		margin: 0;
	}

	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		margin-top: 1rem;
		background: hsl(var(--muted));
		border-radius: var(--radius);
	}

	.pagination-info {
		font-size: 0.875rem;
		color: hsl(var(--foreground));
	}

	.pagination-controls {
		display: flex;
		gap: 0.25rem;
	}

	.page-button {
		min-width: 2.5rem;
		padding: 0.5rem 0.75rem;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-button:hover:not(:disabled) {
		background: hsl(var(--accent));
		border-color: hsl(var(--primary));
	}

	.page-button.active {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-color: hsl(var(--primary));
	}

	.page-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.audit-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
		}

		.export-button {
			width: 100%;
		}

		.filters-grid {
			grid-template-columns: 1fr;
		}

		.table-header,
		.table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.table-header {
			display: none;
		}
	}
</style>
