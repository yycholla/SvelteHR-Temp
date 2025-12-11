<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import DocumentDataTable from '$lib/components/ui/document-datatable.svelte';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import UploadDocumentModal from '$lib/components/documents/UploadDocumentModal.svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Calendar,
		ChevronRight,
		Download,
		Eye,
		FileText,
		Filter,
		HardDrive,
		LayoutGrid,
		Lock,
		PieChart,
		ShieldCheck,
		Table as TableIcon,
		Upload,
		User,
		X
	} from '@lucide/svelte';
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
		(data.assigneeOptions || []).map((assignee) => ({
			value: assignee.id,
			label: assignee.displayName
		}))
	);

	const combinedSearchOptions = $derived([...documentSearchOptions, ...assigneeSearchOptions]);

	// Stats
	const totalDocuments = $derived(data.totalCount);
	const encryptedCount = $derived(
		data.documents.filter((doc: { is_encrypted: boolean }) => doc.is_encrypted).length
	);
	const expiringCount = $derived(
		data.documents.filter((doc: { expiration_date?: Date | string }) => {
			if (!doc.expiration_date) return false;
			const expiryDate = new Date(doc.expiration_date);
			const now = Date.now();
			const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
			return expiryDate.getTime() <= thirtyDaysFromNow;
		}).length
	);
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

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<a href="/dashboard" class="hover:text-foreground">Dashboard</a>
			<ChevronRight class="h-4 w-4" />
			<span class="font-medium text-foreground">Documents</span>
		</div>

		{#if canUpload}
			<Button onclick={() => (isUploadModalOpen = true)} class="gap-2 shadow-sm">
				<Upload class="h-4 w-4" />
				Upload Document
			</Button>
		{/if}
	</div>

	<!-- Bento Grid -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
		<!-- 1. Total Documents -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm">
			<div class="mb-3 flex items-center justify-between text-muted-foreground">
				<span class="text-xs font-semibold tracking-wider uppercase">Total Files</span>
				<FileText class="h-4 w-4" />
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-bold">{totalDocuments}</span>
				<span class="text-xs text-muted-foreground">stored</span>
			</div>
		</div>

		<!-- 2. Encrypted -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm">
			<div class="mb-3 flex items-center justify-between text-muted-foreground">
				<span class="text-xs font-semibold tracking-wider uppercase">Secure</span>
				<ShieldCheck class="h-4 w-4" />
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-bold">{encryptedCount}</span>
				<span class="text-xs text-muted-foreground">encrypted</span>
			</div>
		</div>

		<!-- 3. Expiring Soon -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm">
			<div class="mb-3 flex items-center justify-between text-muted-foreground">
				<span class="text-xs font-semibold tracking-wider uppercase">Expiring</span>
				<Calendar class="h-4 w-4" />
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-bold text-orange-600">{expiringCount}</span>
				<span class="text-xs text-muted-foreground">soon</span>
			</div>
		</div>

		<!-- 4. Storage Used -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm">
			<div class="mb-3 flex items-center justify-between text-muted-foreground">
				<span class="text-xs font-semibold tracking-wider uppercase">Storage</span>
				<HardDrive class="h-4 w-4" />
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-bold">{formatFileSize(totalSize)}</span>
				<span class="text-xs text-muted-foreground">used</span>
			</div>
		</div>
	</div>

	<!-- Main Document Table -->
	<div class="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
		<!-- Toolbar -->
		<div class="border-b p-4">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<!-- Search -->
				<div class="flex-1 md:max-w-md">
					<MultiSearchInput
						bind:searchTerms
						options={combinedSearchOptions}
						onSearchChange={handleSearch}
						debounceMs={500}
						allowCustomTerms={false}
						placeholder="Search documents or assignees..."
					/>
				</div>

				<!-- Filters -->
				<div class="flex items-center gap-2">
					{#if hasActiveFilters}
						<Button variant="ghost" size="sm" onclick={clearFilters} class="h-8 px-2 lg:px-3">
							Clear
							<X class="ml-2 h-4 w-4" />
						</Button>
					{/if}

					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button variant="outline" size="sm" {...props} class="h-8">
									<Filter class="mr-2 h-3.5 w-3.5" />
									Filter
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Label>Category</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onclick={() => {
									selectedCategory = 'all';
									applyFilters();
								}}>All</DropdownMenu.Item
							>
							{#each categories as category}
								<DropdownMenu.Item
									onclick={() => {
										selectedCategory = category;
										applyFilters();
									}}>{category}</DropdownMenu.Item
								>
							{/each}
							<DropdownMenu.Separator />
							<DropdownMenu.Label>Sensitivity</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onclick={() => {
									selectedSensitivity = 'all';
									applyFilters();
								}}>All</DropdownMenu.Item
							>
							{#each sensitivityLevels as level}
								<DropdownMenu.Item
									onclick={() => {
										selectedSensitivity = level;
										applyFilters();
									}}>{level}</DropdownMenu.Item
								>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
		</div>

		<!-- Table Content -->
		<div class="flex-1 overflow-auto bg-muted/5">
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
						onColumnVisibilityChange={(v) => (columnVisibility = v)}
						onPreview={handlePreview}
						onDownload={handleDownload}
					/>
				</Tooltip.Provider>
			{:else}
				<!-- Simplified Grid View if toggled -->
				<div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.documents as doc}
						<div
							class="flex flex-col rounded-lg border bg-background p-4 shadow-sm transition-all hover:shadow-md"
						>
							<div class="mb-2 flex items-start justify-between">
								<div class="flex h-10 w-10 items-center justify-center rounded bg-muted text-xl">
									<FileText class="h-5 w-5 text-muted-foreground" />
								</div>
								<Badge variant="outline">{doc.category}</Badge>
							</div>
							<h3 class="mb-1 leading-none font-medium">{doc.filename}</h3>
							<p class="text-xs text-muted-foreground">
								{formatFileSize(doc.file_size_bytes)} • {new Date(
									doc.uploaded_at
								).toLocaleDateString()}
							</p>
							<div class="mt-4 flex gap-2">
								<Button
									variant="secondary"
									size="sm"
									class="w-full"
									onclick={() => handlePreview(doc.id)}>Preview</Button
								>
								<Button
									variant="ghost"
									size="icon"
									class="shrink-0"
									onclick={() => handleDownload(doc.id)}
								>
									<Download class="h-4 w-4" />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
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
