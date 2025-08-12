<script lang="ts">
	import { goto } from '$app/navigation';
	import { FileText, Upload, Search, Download, Eye, Trash2, Filter, Plus } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';
	import { NotificationCenter } from '$lib/components/ui/notification-center';
	import { EnhancedBulkActionsBar } from '$lib/components/ui/bulk-operations';
	import { LiveMetricCard } from '$lib/components/ui/dashboard-cards';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states (initialized from server data)
  let searchTerm = $state(data.filters.search);
	let categoryFilter = $state(data.filters.category);
	let departmentFilter = $state(data.filters.department);
	let currentPage = $state(data.pagination.currentPage);
	let pageSize = $state(data.pagination.pageSize);
  let uploadOpen = $state(false);

	// Derived data from server
	const documents = $derived(data.documents);
	const departments = $derived(data.departments);
	const totalPages = $derived(data.pagination.totalPages);
	const totalCount = $derived(data.pagination.totalCount);
	const loading = $state(false);
	const error = $derived(data.error || '');

	// Document categories
	const documentCategories = [
		'HR Policies',
		'Employee Handbooks',
		'Forms',
		'Contracts',
		'Training Materials',
		'Compliance Documents',
		'Benefits Information',
		'Performance Reviews',
		'Personal Documents'
	];

	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();

		if (searchTerm) params.set('search', searchTerm);
		if (categoryFilter !== 'all') params.set('category', categoryFilter);
		if (departmentFilter !== 'all') params.set('department', departmentFilter);
		params.set('page', currentPage.toString());
		params.set('pageSize', pageSize.toString());

		const queryString = params.toString();
		const newUrl = queryString ? `/hr/documents?${queryString}` : '/hr/documents';

		await goto(newUrl);
	}

	function formatFileSize(bytes: number | null): string {
		if (!bytes) return 'Unknown size';

		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(1)} ${units[unitIndex]}`;
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Unknown date';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(dateString));
	}

	function getFileIcon(fileType: string | null): string {
		if (!fileType) return 'text-muted-foreground';

		if (fileType.includes('pdf')) return 'text-red-500';
		if (fileType.includes('word') || fileType.includes('document')) return 'text-blue-500';
		if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'text-green-500';
		if (fileType.includes('image')) return 'text-purple-500';

		return 'text-muted-foreground';
	}

	async function handleDownload(document: any) {
		try {
			// TODO: Implement server-side document download
			console.log('Download document:', document.id);
		} catch (err: any) {
			console.error('Error downloading document:', err);
		}
	}

	async function handleDelete(document: any) {
		if (!confirm(`Are you sure you want to delete "${document.title}"?`)) return;

		try {
			// TODO: Implement server-side document deletion
			console.log('Delete document:', document.id);
		} catch (err: any) {
			console.error('Error deleting document:', err);
		}
	}

	function clearFilters() {
		searchTerm = '';
		categoryFilter = 'all';
		departmentFilter = 'all';
		currentPage = 1;
		applyFilters();
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			applyFilters();
		}
	}

	// Debounced search - apply filters when search term changes
	let searchTimeout: NodeJS.Timeout;
	$effect(() => {
		if (searchTerm !== data.filters.search) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				currentPage = 1; // Reset to first page on search
				applyFilters();
			}, 500); // 500ms debounce
		}
	});

	// Apply filters when category or department filter changes
	$effect(() => {
		if (categoryFilter !== data.filters.category || departmentFilter !== data.filters.department) {
			currentPage = 1; // Reset to first page on filter change
			applyFilters();
		}
	});
</script>

<svelte:head>
	<title>HR - Document Management - SvelteHR</title>
</svelte:head>

<!-- Notification components (using server-side data only) -->
<NotificationCenter />

<div class="space-y-6">

	<!-- Search and Filters -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<CardTitle>Search and Filters</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col lg:flex-row gap-4">
				<!-- Search -->
				<div class="flex-1">
					<div class="relative">
						<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search documents by title or description..."
							class="pl-9"
							bind:value={searchTerm}
						/>
					</div>
				</div>

				<!-- Category Filter -->
				<select
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={categoryFilter}
				>
					<option value="all">All Categories</option>
					{#each documentCategories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>

				<!-- Department Filter -->
				<select
					class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={departmentFilter}
				>
					<option value="all">All Departments</option>
					{#each departments as dept}
						<option value={dept.id}>{dept.name}</option>
					{/each}
				</select>

				<Button variant="outline" onclick={clearFilters}>
					Clear Filters
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Document Statistics -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Documents</CardTitle>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{totalCount}</div>
				<p class="text-xs text-muted-foreground">Across all categories</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">HR Policies</CardTitle>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					{documents.filter(doc => doc.documentCategory === 'HR Policies').length}
				</div>
				<p class="text-xs text-muted-foreground">Policy documents</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Forms</CardTitle>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					{documents.filter(doc => doc.documentCategory === 'Forms').length}
				</div>
				<p class="text-xs text-muted-foreground">Available forms</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Recent Uploads</CardTitle>
				<Upload class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					{documents.filter(doc => {
						const uploadDate = new Date(doc.uploadDate || '');
						const weekAgo = new Date();
						weekAgo.setDate(weekAgo.getDate() - 7);
						return uploadDate > weekAgo;
					}).length}
				</div>
				<p class="text-xs text-muted-foreground">This week</p>
			</CardContent>
		</Card>
	</div>

	<!-- Documents List -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle>Documents ({totalCount})</CardTitle>
					<CardDescription>
						Showing {documents.length} of {totalCount} documents
					</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<!-- Enhanced bulk operations for documents -->
			<EnhancedBulkActionsBar
				entityType="documents"
				availableActions={[
					{ id: 'download', label: 'Download', icon: 'Download' },
					{ id: 'move-category', label: 'Change Category', icon: 'FolderMove' },
					{ id: 'set-confidential', label: 'Mark Confidential', icon: 'Shield' },
					{ id: 'delete', label: 'Delete', icon: 'Trash2' }
				]}
			/>
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			{:else if error}
				<div class="text-center py-8">
					<p class="text-destructive">{error}</p>
					<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			{:else if documents.length === 0}
				<div class="text-center py-8">
					<FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 class="mt-4 text-lg font-semibold">No documents found</h3>
					<p class="mt-2 text-muted-foreground">
						{searchTerm || categoryFilter !== 'all' || departmentFilter !== 'all'
							? 'Try adjusting your search criteria'
							: 'Upload your first document to get started'}
					</p>
                    {#if !(searchTerm || categoryFilter !== 'all' || departmentFilter !== 'all')}
                        <Button class="mt-4" onclick={() => uploadOpen = true}>
                            <Upload class="h-4 w-4 mr-2" />
                            Upload Document
                        </Button>
                    {/if}
				</div>
			{:else}
				<div class="space-y-4">
					{#each documents as document}
						<div class="border border-border/50 rounded-lg p-4 hover:bg-accent/30 transition-colors">
							<div class="flex items-start justify-between">
								<div class="flex items-start space-x-4 flex-1 min-w-0">
									<div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
										<FileText class="h-5 w-5 {getFileIcon(document.fileType)}" />
									</div>
									<div class="flex-1 min-w-0">
										<h3 class="font-medium text-foreground truncate">
											{document.title}
										</h3>
										<div class="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
											<span>{formatFileSize(document.fileSize)}</span>
											<span>•</span>
											<span>{formatDate(document.uploadDate)}</span>
											{#if document.documentCategory}
												<span>•</span>
												<Badge variant="outline" class="text-xs">
													{document.documentCategory}
												</Badge>
											{/if}
										</div>
										<p class="text-sm text-muted-foreground mt-2 truncate">
											{document.securityLevel ? `${document.securityLevel} • ` : ''}
											Uploaded by: {document.uploadedBy?.firstName || 'Unknown'}
										</p>
									</div>
								</div>

								<div class="ml-4 flex-shrink-0">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm">
												Actions
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onclick={() => handleDownload(document)}>
												<Download class="h-4 w-4 mr-2" />
												Download
											</DropdownMenuItem>
											<DropdownMenuItem>
												<Eye class="h-4 w-4 mr-2" />
												View Details
											</DropdownMenuItem>
											<DropdownMenuItem
												onclick={() => handleDelete(document)}
												class="text-destructive focus:text-destructive"
											>
												<Trash2 class="h-4 w-4 mr-2" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="flex items-center justify-between px-2 py-4">
						<div class="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
						</div>
						<div class="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage <= 1}
								onclick={() => goToPage(currentPage - 1)}
							>
								Previous
							</Button>

							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + Math.max(1, currentPage - 2)) as pageNum}
								{#if pageNum <= totalPages}
									<Button
										variant={currentPage === pageNum ? "default" : "outline"}
										size="sm"
										onclick={() => goToPage(pageNum)}
									>
										{pageNum}
									</Button>
								{/if}
							{/each}

							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= totalPages}
								onclick={() => goToPage(currentPage + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>

	<!-- Fixed position add button in bottom right corner -->
	<div class="fixed bottom-6 right-6 z-50">
        <Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200" onclick={() => uploadOpen = true}>
			<Upload class="h-5 w-5" />
		</Button>
	</div>

    {#if typeof uploadOpen === 'undefined'}
        {@html ''}
    {/if}
    {#if uploadOpen}
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-background rounded-xl border border-border p-6 w-full max-w-md">
            <h3 class="font-semibold mb-2">Upload Document</h3>
            <p class="text-sm text-muted-foreground mb-4">Placeholder modal. Hook up your upload form here.</p>
            <div class="flex justify-end"><Button variant="outline" onclick={() => uploadOpen = false}>Close</Button></div>
        </div>
    </div>
    {/if}
</div>
