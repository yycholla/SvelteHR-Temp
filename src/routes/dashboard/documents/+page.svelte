<script lang="ts">
	// Document list page (Feature 024)
	// Main document management page with filtering, search, and actions

	import { goto } from '$app/navigation';
	import DocumentTable from '$lib/components/documents/DocumentTable.svelte';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Pagination from '$lib/components/ui/pagination';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { Upload, ChevronLeft, ChevronRight } from '@lucide/svelte';
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

<div class="container mx-auto py-6 space-y-6">
	<!-- Page header -->
	<div class="flex justify-between items-start gap-4">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">Documents</h1>
			<p class="text-muted-foreground">
				Manage and access employee documents with end-to-end encryption
			</p>
		</div>

		{#if canUpload}
			<Button href="/dashboard/documents/upload" class="gap-2">
				<Upload class="h-4 w-4" />
				Upload Document
			</Button>
		{/if}
	</div>

	<!-- Document table -->
	<Card.Root>
		<Card.Content class="p-6">
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
		</Card.Content>
	</Card.Root>

	<!-- Pagination controls -->
	{#if data.totalPages > 1}
		<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
			<!-- Results info -->
			<div class="text-sm text-muted-foreground">
				Showing {Math.min((data.page - 1) * data.limit + 1, data.totalCount)} to {Math.min(data.page * data.limit, data.totalCount)} of {data.totalCount} documents
			</div>

			<!-- Pagination -->
			<PaginationPrimitive.Root
				count={data.totalCount}
				perPage={data.limit}
				page={data.page}
				siblingCount={1}
				onpagechange={(page) => handlePageChange(page)}
			>
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton onclick={() => handlePageChange(data.page - 1)}>
								<ChevronLeft class="h-4 w-4" />
								<span>Previous</span>
							</Pagination.PrevButton>
						</Pagination.Item>

						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link
										{page}
										isActive={currentPage === page.value}
										onclick={() => handlePageChange(page.value)}
									>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}

						<Pagination.Item>
							<Pagination.NextButton onclick={() => handlePageChange(data.page + 1)}>
								<span>Next</span>
								<ChevronRight class="h-4 w-4" />
							</Pagination.NextButton>
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</PaginationPrimitive.Root>
		</div>
	{/if}

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
