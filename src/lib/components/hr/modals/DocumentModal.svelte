<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton';
	import { modalStore } from '$lib/stores/hr/modals.svelte';
	import DocumentForm from '../forms/DocumentForm.svelte';

	interface Document {
		id?: string;
		title: string;
		description?: string;
		category: string;
		employee_id?: string;
		is_public: boolean;
		file_url?: string;
		file_size?: number;
		file_type?: string;
		created_at?: string;
		updated_at?: string;
	}

	let {
		open = $bindable(false),
		document = $bindable<Document | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create')
	}: {
		open: boolean;
		document?: Document | null;
		mode?: 'create' | 'edit' | 'view';
	} = $props();

	const modalTitle = $derived(() => {
		switch (mode) {
			case 'create':
				return 'Upload Document';
			case 'edit':
				return `Edit Document: ${document?.title}`;
			case 'view':
				return `Document Details: ${document?.title}`;
			default:
				return 'Document';
		}
	});

	function handleClose() {
		open = false;
		modalStore.close();
	}

	function handleSuccess(savedDocument: Document) {
		open = false;
		modalStore.close();
	}
</script>

<Modal bind:open width="w-modal-wide">
	<div class="card p-6">
		<header class="card-header mb-6">
			<h3 class="h3 font-bold">{modalTitle}</h3>
		</header>

		<section class="card-body">
			<DocumentForm {document} {mode} onCancel={handleClose} onSuccess={handleSuccess} />
		</section>
	</div>
</Modal>
