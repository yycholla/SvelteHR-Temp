<script lang="ts">
	// Audit log page (Feature 024)
	import { logger } from '$lib/utils/logger';
	// Access log viewer for HR/Admin with filtering and export

	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	
	// Import decomposed components
	import AuditHeader from '$lib/components/documents/audit/AuditHeader.svelte';
	import AuditFilters from '$lib/components/documents/audit/AuditFilters.svelte';
	import AuditTable from '$lib/components/documents/audit/AuditTable.svelte';

	const { data }: { data: PageData } = $props();

	// Svelte 5 state
	let filterDocumentId = $state('');
	let filterUserId = $state('');
	let filterAccessType = $state<string | null>(null);
	let filterDateFrom = $state('');
	let filterDateTo = $state('');

	// Access types (matches database schema)
	const accessTypes = ['view', 'download', 'print', 'share'];

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
			logger.error('Export error:', error as Error);
			alert('Failed to export audit log. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Document Audit Log | HR System</title>
</svelte:head>

<div class="audit-page">
	<AuditHeader onExport={exportToCSV} />

	<AuditFilters
		bind:filterDocumentId
		bind:filterUserId
		bind:filterAccessType
		bind:filterDateFrom
		bind:filterDateTo
		{accessTypes}
		onApply={applyFilters}
		onClear={clearFilters}
	/>

	<AuditTable
		accessLogs={data.accessLogs}
		totalCount={data.totalCount}
		page={data.page}
		limit={data.limit}
		onPageChange={goToPage}
	/>
</div>

<style>
	.audit-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	@media (max-width: 768px) {
		.audit-page {
			padding: 1rem;
		}
	}
</style>