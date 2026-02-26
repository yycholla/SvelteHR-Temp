<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import DocumentDataTable from '$lib/components/ui/document-datatable.svelte';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import UploadDocumentModal from '$lib/components/documents/UploadDocumentModal.svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Badge } from '$lib/components/ui/badge';
	import { Download, FileText, Filter, HardDrive, ShieldCheck, Upload, X } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { VisibilityState } from '@tanstack/table-core';

	const { data }: { data: PageData } = $props();

	// View mode state
	const viewMode = $state<'grid' | 'table'>('table');

	// Modal state
	let isUploadModalOpen = $state(false);

	// Column visibility state
	let columnVisibility = $state<VisibilityState>({
		filename: true,
		category: true,
		sensitivity_level: true,
		assigned_users: true,
		uploaded_at: true,
		expiration_date: false,
		file_size_bytes: false,
		version_number: false
	});

	// Search & Filter state
	let searchTerms = $state<string[]>([]);
	let selectedCategory = $state<string>('all');
	let selectedSensitivity = $state<string>('all');
	let perPage = $state(data.limit || 20);

	// Preview modal state
	let isPreviewOpen = $state(false);
	let previewDocumentId = $state<string | null>(null);
	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// Derived state
	const canUpload = $derived.by(() => {
		// Debug permissions
		if (typeof window !== 'undefined') {
			logger.info('[Documents] Checking permissions:', {
				role: data.user?.role,
				permissions: data.userPermissions
			});
		}

		// Check permissions
		if (data.userPermissions?.includes('documents:write')) return true;

		// Check role (case-insensitive)
		const role = data.user?.role?.toLowerCase();

		const adminRoles = ['admin', 'super_admin', 'system_admin'];

		if (role && adminRoles.includes(role)) return true;

		return false;
	});

	const previewDocument = $derived(
		previewDocumentId
			? data.documents.find((doc: { id: string }) => doc.id === previewDocumentId)
			: null
	);

	const hasActiveFilters = $derived(
		searchTerms.length > 0 || selectedCategory !== 'all' || selectedSensitivity !== 'all'
	);

	// Search Options
	const documentSearchOptions = $derived(
		data.documents.map((doc: { id: string; filename: string }) => ({
			value: doc.id,
			label: doc.filename
		}))
	);

	const assigneeSearchOptions = $derived(
		(data.assigneeOptions || []).map((assignee: { id: string; displayName: string }) => ({
			value: assignee.id,
			label: assignee.displayName
		}))
	);

	const combinedSearchOptions = $derived([...documentSearchOptions, ...assigneeSearchOptions]);

	// Stats
	const totalDocuments = $derived(data.totalCount);
	const totalSize = $derived(
		data.documents.reduce(
			(acc: number, doc: { file_size_bytes: number }) => acc + doc.file_size_bytes,
			0
		)
	);

	// Actions
	function handleSearch(terms: string[]) {
		searchTerms = terms;
		applyFilters();
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchTerms.length > 0) params.set('search', searchTerms.join(','));
		if (selectedCategory !== 'all') params.set('category', selectedCategory);
		if (selectedSensitivity !== 'all') params.set('sensitivity', selectedSensitivity);
		params.set('page', '1');
		params.set('limit', perPage.toString());
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function clearFilters() {
		searchTerms = [];
		selectedCategory = 'all';
		selectedSensitivity = 'all';
		applyFilters();
	}

	function handlePageChange(page: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', page.toString());
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	function handlePerPageChange(newPerPage: number) {
		perPage = newPerPage;
		const params = new URLSearchParams(window.location.search);
		params.set('limit', newPerPage.toString());
		params.set('page', '1');
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	async function handlePreview(documentId: string) {
		previewDocumentId = documentId;
		isPreviewOpen = true;
		previewLoading = true;
		previewError = null;
		try {
			const response = await fetch(`/api/documents/${documentId}/preview`);
			if (!response.ok) throw new Error('Failed to generate preview');
			const result = await response.json();
			previewUrl = result.previewUrl;
		} catch (error) {
			previewError = error instanceof Error ? error.message : 'Failed to load preview';
		} finally {
			previewLoading = false;
		}
	}

	function handleDownload(documentId: string) {
		window.open(`/api/documents/${documentId}/download`, '_blank');
	}

	function canPreview(doc: (typeof data.documents)[0]): boolean {
		const role = data.user?.role;
		if (role === 'super_admin' || role === 'admin' || role === 'system_admin') return true;
		return doc.uploaded_by === data.user?.id;
	}

	function canDownload(doc: (typeof data.documents)[0]): boolean {
		const role = data.user?.role;
		if (role === 'super_admin' || role === 'admin' || role === 'system_admin') return true;
		return doc.uploaded_by === data.user?.id;
	}

	const sensitivityLevels = ['Public', 'Internal', 'Confidential', 'Sensitive-PII'];
	const categories = ['Contract', 'Policy', 'Report', 'Invoice', 'Certificate', 'Other'];

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<svelte:head>
	<title>Documents - MountainHR Dashboard</title>
</svelte:head>

<div class="flex flex-col h-full overflow-hidden bg-background">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4 flex-1">
			<h1 class="text-sm font-semibold tracking-tight whitespace-nowrap">Documents</h1>
			<div class="h-4 w-px bg-border"></div>

			<!-- Search & Filters -->
			<div class="flex items-center gap-2 flex-1 max-w-2xl">
				<div class="flex-1 max-w-md">
					<MultiSearchInput
						bind:searchTerms
						options={combinedSearchOptions}
						onSearchChange={handleSearch}
						debounceMs={500}
						allowCustomTerms={false}
						placeholder="Search documents..."
					/>
				</div>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button variant="outline" size="sm" {...props} class="h-8 text-xs">
								<Filter class="mr-2 h-3 w-3" />
								{selectedCategory === 'all' ? 'Category' : selectedCategory}
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start">
						<DropdownMenu.Label>Category</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onclick={() => {
								selectedCategory = 'all';
								applyFilters();
							}}>All</DropdownMenu.Item
						>
						{#each categories as category (category)}
							<DropdownMenu.Item
								onclick={() => {
									selectedCategory = category;
									applyFilters();
								}}>{category}</DropdownMenu.Item
							>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button variant="outline" size="sm" {...props} class="h-8 text-xs">
								<ShieldCheck class="mr-2 h-3 w-3" />
								{selectedSensitivity === 'all' ? 'Sensitivity' : selectedSensitivity}
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start">
						<DropdownMenu.Label>Sensitivity</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onclick={() => {
								selectedSensitivity = 'all';
								applyFilters();
							}}>All</DropdownMenu.Item
						>
						{#each sensitivityLevels as level (level)}
							<DropdownMenu.Item
								onclick={() => {
									selectedSensitivity = level;
									applyFilters();
								}}>{level}</DropdownMenu.Item
							>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				{#if hasActiveFilters}
					<Button variant="ghost" size="sm" onclick={clearFilters} class="h-8 px-2 text-xs">
						<X class="h-3 w-3" />
					</Button>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- Stats Summary in Toolbar -->
			<div
				class="hidden lg:flex items-center gap-4 mr-4 text-xs text-muted-foreground border-r pr-4 h-8"
			>
				<div class="flex items-center gap-1.5">
					<FileText class="h-3.5 w-3.5" />
					<span>{totalDocuments}</span>
				</div>
				<div class="flex items-center gap-1.5">
					<HardDrive class="h-3.5 w-3.5" />
					<span>{formatFileSize(totalSize)}</span>
				</div>
			</div>

			{#if canUpload}
				<Button onclick={() => (isUploadModalOpen = true)} class="gap-1.5 h-8 text-xs">
					<Upload class="h-3.5 w-3.5" />
					Upload
				</Button>
			{/if}
		</div>
	</header>

	<!-- Table Content -->
	<div class="flex-1 overflow-hidden min-h-0 relative">
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
					showPerPageControl={false}
					columnVisibilityState={columnVisibility}
					onColumnVisibilityChange={(v) => (columnVisibility = v)}
					onPreview={handlePreview}
					onDownload={handleDownload}
					dense={true}
				/>
			</Tooltip.Provider>
		{:else}
			<div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 overflow-auto h-full">
				{#each data.documents as doc (doc.id)}
					<div
						class="flex flex-col rounded-md border bg-background p-3 shadow-sm hover:border-primary/50 transition-colors"
					>
						<div class="mb-2 flex items-start justify-between">
							<div class="flex h-8 w-8 items-center justify-center rounded bg-muted text-lg">
								<FileText class="h-4 w-4 text-muted-foreground" />
							</div>
							<Badge variant="outline" class="text-[10px] h-5">{doc.category}</Badge>
						</div>
						<h3 class="mb-1 text-sm font-medium truncate" title={doc.filename}>{doc.filename}</h3>
						<p class="text-[10px] text-muted-foreground">
							{formatFileSize(doc.file_size_bytes)} • {new Date(
								doc.uploaded_at
							).toLocaleDateString()}
						</p>
						<div class="mt-3 flex gap-2">
							<Button
								variant="secondary"
								size="sm"
								class="w-full h-7 text-xs"
								onclick={() => handlePreview(doc.id)}>Preview</Button
							>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 shrink-0"
								onclick={() => handleDownload(doc.id)}
							>
								<Download class="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Modals -->
	{#if isUploadModalOpen}
		<UploadDocumentModal
			isOpen={isUploadModalOpen}
			onClose={() => (isUploadModalOpen = false)}
			onSuccess={() => window.location.reload()}
			employees={data.allEmployees}
		/>
	{/if}

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
			onClose={() => (isPreviewOpen = false)}
			onDownload={() => handleDownload(previewDocument.id)}
		/>
	{/if}
</div>
