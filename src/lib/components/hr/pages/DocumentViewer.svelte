<script lang="ts">
	import { onMount } from 'svelte';
	import { documentApi, employeeApi } from '../utils/api-helpers';
	import { notifications } from '../utils/notifications';
	import type { Employee } from '$lib/stores/hr/employees';

	interface Document {
		id: string;
		title: string;
		description?: string;
		category: string;
		employee_id?: string;
		is_public: boolean;
		file_url?: string;
		file_size?: number;
		file_type?: string;
		created_at: string;
		updated_at: string;
	}

	let {
		documentId,
		onEdit,
		onDelete
	}: {
		documentId: string;
		onEdit?: (document: Document) => void;
		onDelete?: (document: Document) => void;
	} = $props();

	let document: Document | null = null;
	let assignedEmployee: Employee | null = null;
	let loading = true;
	let showPreview = false;

	onMount(async () => {
		await loadDocument();
	});

	async function loadDocument() {
		loading = true;
		try {
			const response = await documentApi.getById(documentId);
			document = response.data;
			
			// Load assigned employee if exists
			if (document.employee_id) {
				const employeeResponse = await employeeApi.getById(document.employee_id);
				assignedEmployee = employeeResponse.data;
			}
		} catch (error) {
			notifications.apiError('Failed to load document details');
		} finally {
			loading = false;
		}
	}

	function handleEdit() {
		if (document && onEdit) {
			onEdit(document);
		}
	}

	function handleDelete() {
		if (document && onDelete) {
			onDelete(document);
		}
	}

	function formatFileSize(bytes?: number): string {
		if (!bytes) return 'Unknown size';
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getFileIcon(fileType?: string): string {
		if (!fileType) return '📄';
		
		const type = fileType.toLowerCase();
		if (type.includes('pdf')) return '📕';
		if (type.includes('word') || type.includes('doc')) return '📘';
		if (type.includes('excel') || type.includes('sheet')) return '📗';
		if (type.includes('powerpoint') || type.includes('presentation')) return '📙';
		if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('gif')) return '🖼️';
		if (type.includes('text')) return '📝';
		return '📄';
	}

	function getCategoryBadgeClass(category: string): string {
		const categoryClasses: Record<string, string> = {
			'HR Policies': 'variant-filled-primary',
			'Employee Handbook': 'variant-filled-secondary',
			'Training Materials': 'variant-filled-tertiary',
			'Forms and Templates': 'variant-filled-success',
			'Compliance Documents': 'variant-filled-warning',
			'Benefits Information': 'variant-filled-error',
			'Performance Reviews': 'variant-filled-surface',
			'Contracts': 'variant-filled-primary',
			'Certificates': 'variant-filled-success',
			'Legal Documents': 'variant-filled-warning',
			'Other': 'variant-ghost-surface'
		};
		return categoryClasses[category] || 'variant-ghost-surface';
	}

	function canPreview(fileType?: string): boolean {
		if (!fileType) return false;
		const type = fileType.toLowerCase();
		return type.includes('pdf') || type.includes('image') || type.includes('text');
	}

	function getPreviewUrl(fileUrl?: string, fileType?: string): string {
		if (!fileUrl || !canPreview(fileType)) return '';
		
		// For PDFs, we can embed them directly
		if (fileType?.toLowerCase().includes('pdf')) {
			return fileUrl + '#toolbar=1';
		}
		
		// For images and text files, return as-is
		return fileUrl;
	}

	function downloadDocument() {
		if (document?.file_url) {
			const link = document.createElement('a');
			link.href = document.file_url;
			link.download = document.title;
			link.click();
		}
	}
</script>

{#if loading}
	<div class="space-y-6">
		<div class="placeholder animate-pulse h-8 w-64 rounded"></div>
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<div class="card p-6">
					<div class="space-y-4">
						{#each Array(6) as _}
							<div class="placeholder animate-pulse h-4 w-full rounded"></div>
						{/each}
					</div>
				</div>
			</div>
			<div class="space-y-6">
				<div class="card p-6">
					<div class="space-y-4">
						{#each Array(4) as _}
							<div class="placeholder animate-pulse h-4 w-full rounded"></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else if document}
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
			<div class="flex-1">
				<div class="flex items-start gap-3 mb-2">
					<div class="text-4xl">{getFileIcon(document.file_type)}</div>
					<div>
						<h1 class="h1 font-bold">{document.title}</h1>
						<div class="flex flex-wrap gap-2 items-center mt-2">
							<span class="badge {getCategoryBadgeClass(document.category)}">
								{document.category}
							</span>
							<span class="badge variant-{document.is_public ? 'filled-success' : 'filled-warning'}">
								{document.is_public ? 'Public' : 'Private'}
							</span>
							{#if document.file_size}
								<span class="badge variant-soft text-xs">
									{formatFileSize(document.file_size)}
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
			
			<div class="flex gap-2">
				{#if document.file_url}
					<button class="btn variant-filled-secondary" on:click={downloadDocument}>
						Download
					</button>
					{#if canPreview(document.file_type)}
						<button 
							class="btn variant-filled-tertiary" 
							on:click={() => showPreview = !showPreview}
						>
							{showPreview ? 'Hide Preview' : 'Preview'}
						</button>
					{/if}
				{/if}
				{#if onEdit}
					<button class="btn variant-filled-primary" on:click={handleEdit}>
						Edit
					</button>
				{/if}
				{#if onDelete}
					<button class="btn variant-filled-error" on:click={handleDelete}>
						Delete
					</button>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Description -->
				{#if document.description}
					<div class="card">
						<header class="card-header">
							<h3 class="h3 font-semibold">Description</h3>
						</header>
						<section class="p-6">
							<div class="prose prose-sm max-w-none dark:prose-invert">
								<p class="whitespace-pre-wrap">{document.description}</p>
							</div>
						</section>
					</div>
				{/if}

				<!-- Document Preview -->
				{#if showPreview && canPreview(document.file_type) && document.file_url}
					<div class="card">
						<header class="card-header">
							<h3 class="h3 font-semibold">Preview</h3>
						</header>
						<section class="p-0">
							{#if document.file_type?.toLowerCase().includes('pdf')}
								<iframe
									src={getPreviewUrl(document.file_url, document.file_type)}
									class="w-full h-96 border-0"
									title="Document Preview"
								></iframe>
							{:else if document.file_type?.toLowerCase().includes('image')}
								<img
									src={document.file_url}
									alt={document.title}
									class="w-full h-auto max-h-96 object-contain"
								/>
							{:else if document.file_type?.toLowerCase().includes('text')}
								<div class="p-6 bg-surface-50-900-token">
									<pre class="text-sm overflow-auto max-h-96">{document.file_url}</pre>
								</div>
							{/if}
						</section>
					</div>
				{/if}

				<!-- File Information -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">File Information</h3>
					</header>
					<section class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
							<div>
								<span class="font-semibold text-surface-600-300-token">File Type:</span>
								<div class="mt-1 text-base">
									{document.file_type || 'Unknown'}
								</div>
							</div>
							
							<div>
								<span class="font-semibold text-surface-600-300-token">File Size:</span>
								<div class="mt-1 text-base">
									{formatFileSize(document.file_size)}
								</div>
							</div>
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Uploaded:</span>
								<div class="mt-1 text-base">
									{new Date(document.created_at).toLocaleDateString()}
									<div class="text-xs text-surface-600-300-token">
										{new Date(document.created_at).toLocaleTimeString()}
									</div>
								</div>
							</div>
							
							<div>
								<span class="font-semibold text-surface-600-300-token">Last Modified:</span>
								<div class="mt-1 text-base">
									{new Date(document.updated_at).toLocaleDateString()}
									<div class="text-xs text-surface-600-300-token">
										{new Date(document.updated_at).toLocaleTimeString()}
									</div>
								</div>
							</div>
							
							<div class="md:col-span-2">
								<span class="font-semibold text-surface-600-300-token">Access Level:</span>
								<div class="mt-1">
									<span class="badge variant-{document.is_public ? 'filled-success' : 'filled-warning'}">
										{document.is_public ? 'Public - All employees can access' : 'Private - Restricted access'}
									</span>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Quick Actions -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Actions</h3>
					</header>
					<section class="p-6 space-y-3">
						{#if document.file_url}
							<button class="btn variant-filled-primary w-full" on:click={downloadDocument}>
								📥 Download
							</button>
							{#if canPreview(document.file_type)}
								<button 
									class="btn variant-filled-secondary w-full" 
									on:click={() => showPreview = !showPreview}
								>
									👁️ {showPreview ? 'Hide Preview' : 'Preview'}
								</button>
							{/if}
							<a 
								href={document.file_url} 
								target="_blank" 
								class="btn variant-filled-tertiary w-full"
							>
								🔗 Open in New Tab
							</a>
						{/if}
					</section>
				</div>

				<!-- Document Details -->
				<div class="card">
					<header class="card-header">
						<h3 class="h3 font-semibold">Details</h3>
					</header>
					<section class="p-6 space-y-4">
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-2">
								Category
							</div>
							<div class="badge {getCategoryBadgeClass(document.category)}">
								{document.category}
							</div>
						</div>
						
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-2">
								Access Level
							</div>
							<div class="badge variant-{document.is_public ? 'filled-success' : 'filled-warning'}">
								{document.is_public ? 'Public' : 'Private'}
							</div>
						</div>
						
						<div>
							<div class="text-sm font-semibold text-surface-600-300-token mb-1">
								Document ID
							</div>
							<div class="font-mono text-xs bg-surface-100-800-token px-2 py-1 rounded">
								{document.id}
							</div>
						</div>
					</section>
				</div>

				<!-- Assigned Employee -->
				{#if assignedEmployee}
					<div class="card">
						<header class="card-header">
							<h3 class="h3 font-semibold">Assigned To</h3>
						</header>
						<section class="p-6 space-y-3">
							<div class="flex items-center gap-3">
								<div class="avatar bg-primary-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
									{assignedEmployee.first_name[0]}{assignedEmployee.last_name[0]}
								</div>
								<div>
									<div class="font-semibold">
										{assignedEmployee.first_name} {assignedEmployee.last_name}
									</div>
									<div class="text-sm text-surface-600-300-token">
										{assignedEmployee.position}
									</div>
								</div>
							</div>
							
							<div class="text-sm space-y-1">
								<div>
									<span class="font-semibold">Department:</span>
									{assignedEmployee.department}
								</div>
								<div>
									<span class="font-semibold">Email:</span>
									<a href="mailto:{assignedEmployee.email}" class="anchor">
										{assignedEmployee.email}
									</a>
								</div>
							</div>
						</section>
					</div>
				{:else}
					<div class="card">
						<header class="card-header">
							<h3 class="h3 font-semibold">Assignment</h3>
						</header>
						<section class="p-6">
							<div class="text-center text-surface-600-300-token">
								<div class="text-2xl mb-2">👥</div>
								<div class="text-sm">
									{document.is_public ? 'Available to all employees' : 'No specific assignment'}
								</div>
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="card p-8 text-center">
		<h2 class="h2 mb-4">Document Not Found</h2>
		<p class="text-surface-600-300-token">
			The document you're looking for could not be found.
		</p>
	</div>
{/if}

<style>
	.avatar {
		flex-shrink: 0;
	}
</style>