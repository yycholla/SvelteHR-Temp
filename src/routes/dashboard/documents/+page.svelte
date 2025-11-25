<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Clock,
		Download,
		Eye,
		FileText,
		Filter,
		Folder,
		HardDrive,
		LayoutGrid,
		List,
		Lock,
		Search,
		Trash2,
		Upload
	} from '@lucide/svelte';
	import { format } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import { confirmService } from '$lib/stores/confirm.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import UploadDocumentModal from '$lib/components/documents/UploadDocumentModal.svelte';

	const { data } = $props();

	// State
	let searchQuery = $state('');
	let viewMode = $state<'table' | 'grid'>('table');
	let showUploadModal = $state(false);
	
	// Preview state
	let isPreviewOpen = $state(false);
	let previewDocument = $state<any>(null);
	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// Derived stats
	const documents = $derived(data.documents || []);
	const filteredDocuments = $derived(
		documents.filter((doc: any) =>
			doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
			doc.category.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const totalSize = $derived(documents.reduce((acc: number, doc: any) => acc + doc.file_size_bytes, 0));
	const encryptedCount = $derived(documents.filter((doc: any) => doc.is_encrypted).length);
	const recentUpload = $derived(
		[...documents].sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0]
	);
	const categories = $derived([...new Set(documents.map((doc: any) => doc.category))]);

	// Format helpers
	function formatFileSize(bytes: number) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDate(dateString: string) {
		return format(new Date(dateString), 'MMM dd, yyyy');
	}

	function getFileIcon(mimeType: string) {
		// Simplified icon logic
		return FileText;
	}

	// Actions
	async function handlePreview(doc: any) {
		previewDocument = doc;
		isPreviewOpen = true;
		previewLoading = true;
		previewError = null;

		try {
			const response = await fetch(`/api/documents/${doc.id}/preview`);
			if (!response.ok) throw new Error('Failed to generate preview');
			const result = await response.json();
			previewUrl = result.previewUrl;
		} catch (error) {
			previewError = error instanceof Error ? error.message : 'Failed to load preview';
		} finally {
			previewLoading = false;
		}
	}

	async function handleDownload(doc: any) {
		window.open(`/api/documents/${doc.id}/download`, '_blank');
	}

	async function handleDelete(doc: any) {
		const confirmed = await confirmService.ask({
			title: 'Delete Document',
			message: `Are you sure you want to delete "${doc.filename}"? This action cannot be undone.`,
			variant: 'destructive',
			confirmText: 'Delete'
		});

		if (!confirmed) return;

		// Simulate delete for now or implement actual API call if available in existing logic
		// Assuming an API endpoint or mutation exists, otherwise just toast
		toast.info('Delete functionality pending backend integration', {
			description: `Would delete ${doc.filename}`
		});
	}

	function closePreview() {
		isPreviewOpen = false;
		previewDocument = null;
		previewUrl = null;
	}
</script>

<svelte:head>
	<title>My Documents - MountainHR</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">My Documents</h1>
			<p class="text-muted-foreground">Access your secure contracts, reports, and policies.</p>
		</div>
		<div class="flex items-center gap-3">
			<Button onclick={() => showUploadModal = true} class="shadow-lg shadow-primary/20">
				<Upload class="mr-2 h-4 w-4" />
				Upload Document
			</Button>
		</div>
	</div>

	<!-- Main Bento Grid -->
	<div class="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
		
		<!-- 1. Storage Summary (Medium) -->
		<div class="relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 md:col-span-2">
			<div class="relative z-10 flex items-start justify-between">
				<div>
					<h2 class="mb-1 text-lg font-semibold text-foreground">Storage Usage</h2>
					<p class="text-sm text-muted-foreground">Encrypted & Secure</p>
				</div>
				<Badge variant="outline" class="bg-blue-500/10 text-blue-500 border-blue-500/20">
					{formatFileSize(totalSize)} Total
				</Badge>
			</div>

			<div class="relative z-10 mt-6">
				<div class="mb-4 grid grid-cols-3 gap-4">
					<div>
						<p class="text-2xl font-bold text-foreground">{documents.length}</p>
						<p class="text-xs uppercase tracking-wider text-muted-foreground">Total Files</p>
					</div>
					<div>
						<p class="text-2xl font-bold text-foreground">{encryptedCount}</p>
						<p class="text-xs uppercase tracking-wider text-muted-foreground">Encrypted</p>
					</div>
					<!-- <div>
						<p class="text-2xl font-bold text-yellow-500">0</p>
						<p class="text-xs uppercase tracking-wider text-muted-foreground">Expiring</p>
					</div> -->
				</div>
			</div>

			<!-- Decorative Background -->
			<div class="absolute bottom-0 right-0 p-6 opacity-5">
				<HardDrive class="h-32 w-32" />
			</div>
		</div>

		<!-- 2. Recent Upload (Small) -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5">
			<div class="mb-2 flex items-center gap-2 text-muted-foreground">
				<Clock class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Recent</span>
			</div>
			{#if recentUpload}
				<div class="flex flex-1 flex-col justify-center">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-red-500/10 text-red-500">
							<FileText class="h-5 w-5" />
						</div>
						<div class="overflow-hidden">
							<p class="truncate text-sm font-medium text-foreground" title={recentUpload.filename}>
								{recentUpload.filename}
							</p>
							<p class="text-xs text-muted-foreground">{formatDate(recentUpload.uploaded_at)}</p>
						</div>
					</div>
				</div>
				<div class="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
					<span class="text-xs text-muted-foreground">{formatFileSize(recentUpload.file_size_bytes)}</span>
					<button 
						class="text-xs text-primary hover:underline"
						onclick={() => handlePreview(recentUpload)}
					>
						View
					</button>
				</div>
			{:else}
				<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
					No recent uploads
				</div>
			{/if}
		</div>

		<!-- 3. Quick Categories (Small) -->
		<div class="flex flex-col rounded-xl border bg-card p-5">
			<div class="mb-4 flex items-center gap-2 text-muted-foreground">
				<Folder class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Categories</span>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each categories.slice(0, 6) as category}
					<button 
						class="cursor-pointer rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
						onclick={() => searchQuery = String(category)}
					>
						{category}
					</button>
				{/each}
				{#if categories.length > 6}
					<span class="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
						+{categories.length - 6} More
					</span>
				{/if}
			</div>
		</div>

		<!-- 4. Document List (Full Width Table) -->
		<div class="col-span-full row-span-2 flex flex-col overflow-hidden rounded-xl border bg-card">
			<div class="flex flex-col justify-between gap-4 border-b border-border p-5 sm:flex-row sm:items-center">
				<div class="relative w-full sm:w-96">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search documents..."
						bind:value={searchQuery}
						class="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
					/>
				</div>
				<div class="flex gap-2">
					<!-- <Button variant="outline" size="sm" class="gap-2">
						<Filter class="h-3.5 w-3.5" />
						Filter
					</Button> -->
					<div class="flex rounded-md border border-input bg-muted/50 p-0.5">
						<button
							class="rounded p-1.5 {viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}"
							onclick={() => viewMode = 'table'}
						>
							<List class="h-3.5 w-3.5" />
						</button>
						<button
							class="rounded p-1.5 {viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'}"
							onclick={() => viewMode = 'grid'}
						>
							<LayoutGrid class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
			</div>

			<div class="overflow-x-auto">
				{#if viewMode === 'table'}
					<table class="w-full text-left text-sm">
						<thead class="bg-muted/30 text-xs font-medium uppercase text-muted-foreground">
							<tr>
								<th class="px-5 py-3">Name</th>
								<th class="px-5 py-3">Category</th>
								<th class="px-5 py-3">Size</th>
								<th class="px-5 py-3">Uploaded</th>
								<th class="px-5 py-3">Security</th>
								<th class="px-5 py-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each filteredDocuments as doc}
								<tr
									class="group cursor-pointer transition-colors hover:bg-muted/20"
									onclick={() => handlePreview(doc)}
								>
									<td class="px-5 py-4">
										<div class="flex items-center gap-3">
											<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-500">
												<FileText class="h-4 w-4" />
											</div>
											<div>
												<p class="font-medium text-foreground transition-colors group-hover:text-primary">
													{doc.filename}
												</p>
												{#if doc.version_number}
													<p class="text-xs text-muted-foreground">Version {doc.version_number}</p>
												{/if}
											</div>
										</div>
									</td>
									<td class="px-5 py-4 text-muted-foreground">
										<span class="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium">
											{doc.category}
										</span>
									</td>
									<td class="px-5 py-4 text-xs font-mono text-muted-foreground">
										{formatFileSize(doc.file_size_bytes)}
									</td>
									<td class="px-5 py-4 text-xs text-muted-foreground">
										{formatDate(doc.uploaded_at)}
									</td>
									<td class="px-5 py-4">
										{#if doc.is_encrypted}
											<div class="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
												<Lock class="h-3 w-3" /> Encrypted
											</div>
										{:else}
											<span class="text-xs text-muted-foreground">Standard</span>
										{/if}
									</td>
									<td class="px-5 py-4 text-right">
										<div class="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
											<button
												class="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
												title="Preview"
												onclick={(e) => {
													e.stopPropagation();
													handlePreview(doc);
												}}
											>
												<Eye class="h-4 w-4" />
											</button>
											<button
												class="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
												title="Download"
												onclick={(e) => {
													e.stopPropagation();
													handleDownload(doc);
												}}
											>
												<Download class="h-4 w-4" />
											</button>
											<!-- <button
												class="rounded p-1.5 text-destructive hover:bg-muted hover:text-destructive"
												title="Delete"
												onclick={(e) => {
													e.stopPropagation();
													handleDelete(doc);
												}}
											>
												<Trash2 class="h-4 w-4" />
											</button> -->
										</div>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="6" class="py-8 text-center text-muted-foreground">
										No documents found.
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<!-- Grid View -->
					<div class="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredDocuments as doc}
							<div
								class="group relative flex flex-col justify-between rounded-lg border bg-card p-4 transition-shadow hover:shadow-md cursor-pointer"
								onclick={() => handlePreview(doc)}
								onkeydown={(e) => e.key === 'Enter' && handlePreview(doc)}
								role="button"
								tabindex="0"
							>
								<div class="mb-3 flex items-start justify-between">
									<div class="flex h-10 w-10 items-center justify-center rounded bg-blue-500/10 text-blue-500">
										<FileText class="h-5 w-5" />
									</div>
									{#if doc.is_encrypted}
										<Lock class="h-4 w-4 text-emerald-500" />
									{/if}
								</div>
								<div>
									<h3 class="mb-1 font-medium text-foreground truncate" title={doc.filename}>{doc.filename}</h3>
									<p class="text-xs text-muted-foreground">{formatDate(doc.uploaded_at)} • {formatFileSize(doc.file_size_bytes)}</p>
								</div>
								<div class="mt-4 flex gap-2 border-t pt-3">
									<Button variant="outline" size="sm" class="flex-1" onclick={(e) => { e.stopPropagation(); handlePreview(doc); }}>Preview</Button>
									<Button variant="outline" size="sm" class="flex-1" onclick={(e) => { e.stopPropagation(); handleDownload(doc); }}>Download</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Preview Modal -->
	{#if previewDocument}
		<PreviewModal
			isOpen={isPreviewOpen}
			documentId={previewDocument.id}
			filename={previewDocument.filename}
			fileType={previewDocument.file_type}
			{previewUrl}
			isLoading={previewLoading}
			error={previewError}
			canDownload={true}
			onClose={closePreview}
			onDownload={() => handleDownload(previewDocument)}
		/>
	{/if}

	<UploadDocumentModal
		isOpen={showUploadModal}
		onClose={() => showUploadModal = false}
		onSuccess={async () => await invalidateAll()}
	/>
</div>
