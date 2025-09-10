<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { modalStore } from '$lib/stores/hr/modals.svelte';
	import { notifications } from '$lib/components/hr/utils/notifications';
	import { documentApi } from '$lib/components/hr/utils/api-helpers';
	import DocumentViewer from '$lib/components/hr/pages/DocumentViewer.svelte';
	import DocumentModal from '$lib/components/hr/modals/DocumentModal.svelte';
	import type { PageData } from './$types';

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

	let { data }: { data: PageData } = $props();

	let showEditModal = $state(false);
	let showDeleteConfirm = $state(false);

	function handleEdit(document: Document) {
		modalStore.open('document', document, 'edit');
		showEditModal = true;
	}

	function handleDelete(document: Document) {
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!data.document) return;

		try {
			await documentApi.delete(data.document.id);
			notifications.documentDeleted(data.document.title);

			// Navigate back to documents list
			goto('/hr/documents');
		} catch (error) {
			notifications.apiError('Failed to delete document');
		} finally {
			showDeleteConfirm = false;
		}
	}

	function handleEditSuccess(updatedDocument: Document) {
		// Update the page data
		data.document = updatedDocument;
		showEditModal = false;
	}
</script>

<svelte:head>
	<title>
		{data.document ? `${data.document.title} - Document Viewer` : 'Document Viewer'} | SvelteHR
	</title>
	<meta name="description" content="Document viewer and details" />
</svelte:head>

<div class="container mx-auto p-6">
	<!-- Breadcrumb -->
	<nav class="breadcrumb mb-6">
		<ol class="flex items-center space-x-2 text-sm">
			<li><a href="/" class="anchor">Home</a></li>
			<li class="text-surface-400">/</li>
			<li><a href="/hr" class="anchor">HR</a></li>
			<li class="text-surface-400">/</li>
			<li><a href="/hr/documents" class="anchor">Documents</a></li>
			<li class="text-surface-400">/</li>
			<li class="text-surface-600-300-token">
				{data.document ? data.document.title : 'Document'}
			</li>
		</ol>
	</nav>

	<!-- Main Content -->
	{#if data.document}
		<DocumentViewer documentId={data.document.id} onEdit={handleEdit} onDelete={handleDelete} />
	{:else}
		<div class="card p-8 text-center">
			<h2 class="mb-4 h2">Document Not Found</h2>
			<p class="text-surface-600-300-token mb-6">
				The document you're looking for could not be found.
			</p>
			<a href="/hr/documents" class="variant-filled-primary btn"> Back to Documents </a>
		</div>
	{/if}
</div>

<!-- Edit Modal -->
<DocumentModal
	bind:open={showEditModal}
	document={data.document}
	mode="edit"
	onSuccess={handleEditSuccess}
/>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div
		class="modal-backdrop fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
	>
		<div class="w-full max-w-md card p-6">
			<header class="mb-4">
				<h3 class="h3 font-bold text-error-500">Confirm Delete</h3>
			</header>

			<section class="mb-6">
				<p class="text-surface-600-300-token">
					Are you sure you want to delete document
					<strong>"{data.document?.title}"</strong>?
				</p>
				<p class="mt-2 text-sm text-error-500">
					This action cannot be undone and the file will be permanently removed.
				</p>
			</section>

			<footer class="flex justify-end gap-3">
				<button class="variant-ghost-surface btn" on:click={() => (showDeleteConfirm = false)}>
					Cancel
				</button>
				<button class="variant-filled-error btn" on:click={confirmDelete}> Delete Document </button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
