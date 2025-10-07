<script lang="ts">
	// Document list page (Feature 024)
	// Main document management page with filtering, search, and actions

	import { goto } from '$app/navigation';
	import DocumentTable from '$lib/components/documents/DocumentTable.svelte';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import type { PageData } from './$types';
	import type { DocumentFilter } from '$lib/types/document';

	let { data }: { data: PageData } = $props();

	// Svelte 5 state
	let isPreviewOpen = $state(false);
	let previewDocumentId = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// Derived state
	let canUpload = $derived(
		data.userPermissions?.includes('documents:upload') ||
			data.user?.role === 'admin' ||
			data.user?.role === 'super_admin'
	);

	let previewDocument = $derived(
		previewDocumentId
			? data.documents.find((doc) => doc.id === previewDocumentId)
			: null
	);

	// Handle filter changes
	function handleFilterChange(filters: {
		category?: string | null;
		sensitivity?: string | null;
		search?: string;
	}) {
		const params = new URLSearchParams();

		if (filters.category) params.set('category', filters.category);
		if (filters.sensitivity) params.set('sensitivity', filters.sensitivity);
		if (filters.search) params.set('search', filters.search);
		params.set('page', '1'); // Reset to first page on filter change

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Handle page change
	function handlePageChange(page: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', page.toString());
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Handle sort change
	function handleSortChange(field: string, order: string) {
		const params = new URLSearchParams(window.location.search);
		params.set('sortBy', field);
		params.set('sortOrder', order);
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Handle preview
	async function handlePreview(documentId: string) {
		previewDocumentId = documentId;
		isPreviewOpen = true;
		previewLoading = true;
		previewError = null;

		try {
			// Call preview API endpoint
			const response = await fetch(`/api/documents/${documentId}/preview`);

			if (!response.ok) {
				throw new Error('Failed to generate preview');
			}

			const result = await response.json();
			previewUrl = result.previewUrl;
		} catch (error) {
			console.error('Preview error:', error);
			previewError = error instanceof Error ? error.message : 'Failed to load preview';
		} finally {
			previewLoading = false;
		}
	}

	// Handle download
	async function handleDownload(documentId: string) {
		try {
			// Open download in new window/tab
			window.open(`/api/documents/${documentId}/download`, '_blank');
		} catch (error) {
			console.error('Download error:', error);
			alert('Failed to download document. Please try again.');
		}
	}

	// Close preview modal
	function closePreview() {
		isPreviewOpen = false;
		previewDocumentId = null;
		previewUrl = null;
		previewError = null;
	}

	// Check if user can preview a document
	function canPreview(doc: typeof data.documents[0]): boolean {
		const role = data.user?.role;
		if (role === 'super_admin' || role === 'admin') return true;

		// Check if document is assigned to user
		return doc.uploaded_by === data.user?.id;
	}

	// Check if user can download a document
	function canDownload(doc: typeof data.documents[0]): boolean {
		const role = data.user?.role;
		if (role === 'super_admin' || role === 'admin') return true;

		// Check if document is assigned to user
		return doc.uploaded_by === data.user?.id;
	}
</script>

<svelte:head>
	<title>Documents | HR System</title>
</svelte:head>

<div class="documents-page">
	<!-- Page header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Documents</h1>
			<p class="page-description">
				Manage and access employee documents with end-to-end encryption
			</p>
		</div>

		{#if canUpload}
			<a href="/dashboard/documents/upload" class="upload-button">
				⬆️ Upload Document
			</a>
		{/if}
	</div>

	<!-- Document table -->
	<div class="table-container">
		<DocumentTable
			documents={data.documents}
			totalCount={data.totalCount}
			currentPage={data.page}
			pageSize={data.limit}
			sortBy={data.sortBy}
			sortOrder={data.sortOrder}
			filterCategory={data.filterCategory}
			filterSensitivity={data.filterSensitivity}
			searchQuery={data.searchQuery}
			{canPreview}
			{canDownload}
			onPageChange={handlePageChange}
			onSortChange={handleSortChange}
			onFilterChange={handleFilterChange}
			onPreview={handlePreview}
			onDownload={handleDownload}
		/>
	</div>

	<!-- Preview modal -->
	{#if previewDocument}
		<PreviewModal
			isOpen={isPreviewOpen}
			documentId={previewDocument.id}
			filename={previewDocument.filename}
			fileType={previewDocument.file_type}
			{previewUrl}
			isLoading={previewLoading}
			error={previewError}
			canDownload={canDownload(previewDocument)}
			onClose={closePreview}
			onDownload={() => handleDownload(previewDocument.id)}
		/>
	{/if}
</div>

<style>
	.documents-page {
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

	.upload-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		text-decoration: none;
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.upload-button:hover {
		background: hsl(var(--primary) / 0.9);
		transform: translateY(-1px);
		box-shadow: 0 4px 6px hsl(var(--foreground) / 0.1);
	}

	.table-container {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.documents-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
			align-items: stretch;
		}

		.upload-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
