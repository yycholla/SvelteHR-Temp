<script lang="ts">
	// Document list page (Feature 024 - Redesigned to match employees page)
	// Main document management page with comprehensive filtering, search, and view options

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DocumentDataTable from '$lib/components/ui/document-datatable.svelte';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import {
		Upload,
		LayoutGrid,
		Table as TableIcon,
		FileText,
		Lock,
		Calendar,
		User,
		Download,
		Eye,
		Filter,
		X
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { VisibilityState } from '@tanstack/table-core';

	let { data }: { data: PageData } = $props();

	// View mode state: 'grid' or 'table'
	let viewMode = $state<'grid' | 'table'>('table');

	// Column visibility state
	let columnVisibility = $state<VisibilityState>({
		filename: true,
		category: true,
		sensitivity_level: true,
		assigned_users: true,
		uploaded_at: true,
		expiration_date: false,
		file_size_bytes: true,
		version_number: false
	});

	// Search state
	let searchTerms = $state<string[]>([]);

	// Inline filter state
	let selectedCategory = $state<string>('all');
	let selectedSensitivity = $state<string>('all');

	// Per-page state
	let perPage = $state(data.limit || 20);

	// Preview modal state
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
		previewDocumentId ? data.documents.find((doc) => doc.id === previewDocumentId) : null
	);

	let hasActiveFilters = $derived(
		searchTerms.length > 0 || selectedCategory !== 'all' || selectedSensitivity !== 'all'
	);

	// Document and assignee search options for MultiSearchInput
	let documentSearchOptions = $derived(
		data.documents.map((doc) => ({
			value: doc.id,
			label: doc.filename
		}))
	);

	let assigneeSearchOptions = $derived(
		(data.assigneeOptions || []).map((assignee) => ({
			value: assignee.id,
			label: assignee.displayName
		}))
	);

	// Combine both for multi-search
	let combinedSearchOptions = $derived([...documentSearchOptions, ...assigneeSearchOptions]);

	// Statistics
	let totalDocuments = $derived(data.totalCount);
	let encryptedCount = $derived(
		data.documents.filter((doc) => doc.is_encrypted).length
	);
	let expiringCount = $derived(
		data.documents.filter((doc) => {
			if (!doc.expiration_date) return false;
			const expiryDate = new Date(doc.expiration_date);
			const now = Date.now();
			const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
			return expiryDate.getTime() <= thirtyDaysFromNow;
		}).length
	);

	// Handle search changes
	function handleSearch(terms: string[]) {
		searchTerms = terms;
		applyFilters();
	}

	// Handle filter changes
	function applyFilters() {
		const params = new URLSearchParams();

		// Add search terms
		if (searchTerms.length > 0) {
			params.set('search', searchTerms.join(','));
		}

		// Add category filter
		if (selectedCategory !== 'all') {
			params.set('category', selectedCategory);
		}

		// Add sensitivity filter
		if (selectedSensitivity !== 'all') {
			params.set('sensitivity', selectedSensitivity);
		}

		// Reset to first page on filter change
		params.set('page', '1');

		// Add per-page
		params.set('limit', perPage.toString());

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Clear all filters
	function clearFilters() {
		searchTerms = [];
		selectedCategory = 'all';
		selectedSensitivity = 'all';
		applyFilters();
	}

	// Handle page change
	function handlePageChange(page: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', page.toString());
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Handle per-page change
	function handlePerPageChange(newPerPage: number) {
		perPage = newPerPage;
		const params = new URLSearchParams(window.location.search);
		params.set('limit', newPerPage.toString());
		params.set('page', '1'); // Reset to first page
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	// Handle column visibility change
	function handleColumnVisibilityChange(visibility: VisibilityState) {
		columnVisibility = visibility;
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

	// Sensitivity levels for filters
	const sensitivityLevels = ['Public', 'Internal', 'Confidential', 'Sensitive-PII'];

	// Categories for filters
	const categories = [
		'Contract',
		'Policy',
		'Report',
		'Invoice',
		'Certificate',
		'Payslip',
		'License',
		'Other'
	];

	// File type icon
	function getFileIcon(fileType: string): string {
		const icons: Record<string, string> = {
			PDF: '📄',
			JPEG: '🖼️',
			PNG: '🖼️',
			GIF: '🖼️',
			DOCX: '📝',
			XLSX: '📊',
			TXT: '📃',
			CSV: '📈'
		};
		return icons[fileType] || '📎';
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	// Get sensitivity badge variant
	function getSensitivityClass(level: string): string {
		const classes: Record<string, string> = {
			Public: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
			Internal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
			Confidential: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
			'Sensitive-PII': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
		};
		return classes[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
	}
</script>

<svelte:head>
	<title>All Documents | HR System</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
	<!-- Page header -->
	<div class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">All Documents</h1>
			<p class="text-muted-foreground">
				Manage and access all employee documents with end-to-end encryption
			</p>
		</div>

		{#if canUpload}
			<Button href="/dashboard/admin/documents/upload" class="gap-2">
				<Upload class="h-4 w-4" />
				Upload Document
			</Button>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Documents</Card.Title>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalDocuments}</div>
				<p class="text-xs text-muted-foreground">Across all categories</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Encrypted Documents</Card.Title>
				<Lock class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{encryptedCount}</div>
				<p class="text-xs text-muted-foreground">End-to-end encryption</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Expiring Soon</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{expiringCount}</div>
				<p class="text-xs text-muted-foreground">Within 30 days</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters and Controls -->
	<Card.Root>
		<Card.Content class="p-6">
			<div class="space-y-4">
				<!-- Multi-search input -->
				<div class="flex items-center gap-4">
					<div class="flex-1">
						<MultiSearchInput
							bind:searchTerms
							options={combinedSearchOptions}
							onSearchChange={handleSearch}
							debounceMs={500}
							allowCustomTerms={false}
							placeholder="Search by document name or assignee..."
						/>
					</div>
					{#if hasActiveFilters}
						<Button variant="ghost" onclick={clearFilters} class="gap-2">
							<X class="h-4 w-4" />
							Clear
						</Button>
					{/if}
				</div>

				<!-- View toggle and controls -->
				<div class="flex items-center justify-between">
					<!-- Inline filters for table view -->
					{#if viewMode === 'table'}
						<div class="flex items-center gap-2">
							<Filter class="h-4 w-4 text-muted-foreground" />
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button variant="outline" size="sm" {...props}>
											Category: {selectedCategory === 'all' ? 'All' : selectedCategory}
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={() => { selectedCategory = 'all'; applyFilters(); }}>
										All Categories
									</DropdownMenu.Item>
									{#each categories as category}
										<DropdownMenu.Item onclick={() => { selectedCategory = category; applyFilters(); }}>
											{category}
										</DropdownMenu.Item>
									{/each}
								</DropdownMenu.Content>
							</DropdownMenu.Root>

							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button variant="outline" size="sm" {...props}>
											Sensitivity: {selectedSensitivity === 'all' ? 'All' : selectedSensitivity}
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={() => { selectedSensitivity = 'all'; applyFilters(); }}>
										All Levels
									</DropdownMenu.Item>
									{#each sensitivityLevels as level}
										<DropdownMenu.Item onclick={() => { selectedSensitivity = level; applyFilters(); }}>
											{level}
										</DropdownMenu.Item>
									{/each}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					{:else}
						<div></div>
					{/if}

					<!-- View toggle and per-page -->
					<div class="flex items-center gap-2">
						<!-- Per-page dropdown -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button variant="outline" size="sm" {...props}>
										Show: {perPage}
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								{#each [10, 20, 50, 100] as pageSize}
									<DropdownMenu.Item onclick={() => handlePerPageChange(pageSize)}>
										{pageSize} per page
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>

						<!-- View toggle buttons -->
						<div class="flex rounded-md border">
							<Button
								variant={viewMode === 'grid' ? 'default' : 'ghost'}
								size="sm"
								class="rounded-r-none"
								onclick={() => (viewMode = 'grid')}
							>
								<LayoutGrid class="h-4 w-4" />
							</Button>
							<Button
								variant={viewMode === 'table' ? 'default' : 'ghost'}
								size="sm"
								class="rounded-l-none"
								onclick={() => (viewMode = 'table')}
							>
								<TableIcon class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Table view -->
	{#if viewMode === 'table'}
		<Tooltip.Provider>
			<DocumentDataTable
				documents={data.documents}
				assignees={data.assigneeOptions || []}
				{canPreview}
				{canDownload}
				canViewDocuments={true}
				currentPage={data.page}
				pageSize={data.limit}
				totalPages={data.totalPages}
				onPageChange={handlePageChange}
				onPageSizeChange={handlePerPageChange}
				showPerPageControl={true}
				columnVisibilityState={columnVisibility}
				onColumnVisibilityChange={handleColumnVisibilityChange}
				onPreview={handlePreview}
				onDownload={handleDownload}
			/>
		</Tooltip.Provider>
	{/if}

	<!-- Grid view -->
	{#if viewMode === 'grid'}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.documents as document (document.id)}
				<Card.Root class="overflow-hidden hover:shadow-lg transition-shadow">
					<button
						onclick={() => goto(`/dashboard/documents/${document.id}`)}
						class="w-full text-left"
					>
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex items-center gap-2">
									<span class="text-3xl">{getFileIcon(document.file_type)}</span>
									<div>
										<Card.Title class="text-base">{document.filename}</Card.Title>
										<Card.Description class="text-xs">
											{formatFileSize(document.file_size_bytes)}
										</Card.Description>
									</div>
								</div>
								{#if document.is_encrypted}
									<Lock class="h-4 w-4 text-muted-foreground" />
								{/if}
							</div>
						</Card.Header>
						<Card.Content class="pb-3 space-y-2">
							<!-- Category and sensitivity -->
							<div class="flex flex-wrap gap-2">
								<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted">
									{document.category}
								</span>
								{#if document.sensitivity_level}
									<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium {getSensitivityClass(document.sensitivity_level)}">
										{document.sensitivity_level}
									</span>
								{/if}
							</div>

							<!-- Assignees -->
							{#if document.assigned_users && document.assigned_users.length > 0}
								<div class="flex items-center gap-1 text-xs text-muted-foreground">
									<User class="h-3 w-3" />
									{document.assigned_users.slice(0, 2).map(u => u.displayName).join(', ')}
									{#if document.assigned_users.length > 2}
										+{document.assigned_users.length - 2} more
									{/if}
								</div>
							{/if}

							<!-- Upload date -->
							<div class="text-xs text-muted-foreground">
								Uploaded {formatDate(document.uploaded_at)}
							</div>

							<!-- Actions -->
							<div class="flex gap-2 pt-2">
								{#if canPreview(document)}
									<Button
										variant="outline"
										size="sm"
										class="flex-1"
										onclick={(e) => {
											e.stopPropagation();
											handlePreview(document.id);
										}}
									>
										<Eye class="mr-2 h-3 w-3" />
										Preview
									</Button>
								{/if}
								{#if canDownload(document)}
									<Button
										variant="outline"
										size="sm"
										class="flex-1"
										onclick={(e) => {
											e.stopPropagation();
											handleDownload(document.id);
										}}
									>
										<Download class="mr-2 h-3 w-3" />
										Download
									</Button>
								{/if}
							</div>
						</Card.Content>
					</button>
				</Card.Root>
			{/each}
		</div>

		<!-- Grid pagination -->
		{#if data.totalPages > 1}
			<div class="flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={data.page <= 1}
					onclick={() => handlePageChange(data.page - 1)}
				>
					Previous
				</Button>
				<span class="text-sm text-muted-foreground">
					Page {data.page} of {data.totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={data.page >= data.totalPages}
					onclick={() => handlePageChange(data.page + 1)}
				>
					Next
				</Button>
			</div>
		{/if}
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
