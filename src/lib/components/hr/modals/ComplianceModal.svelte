<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton';
	import { modalStore } from '$lib/stores/hr/modals';
	import ComplianceForm from '../forms/ComplianceForm.svelte';

	interface ComplianceRecord {
		id?: string;
		type: string;
		status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
		employee_id?: string;
		due_date?: string;
		notes?: string;
		document_url?: string;
		created_at?: string;
		updated_at?: string;
	}

	let { 
		open = $bindable(false),
		complianceRecord = $bindable<ComplianceRecord | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create')
	}: {
		open: boolean;
		complianceRecord?: ComplianceRecord | null;
		mode?: 'create' | 'edit' | 'view';
	} = $props();

	const modalTitle = $derived(() => {
		switch (mode) {
			case 'create':
				return 'Add Compliance Record';
			case 'edit':
				return `Edit Compliance: ${complianceRecord?.type}`;
			case 'view':
				return `Compliance Details: ${complianceRecord?.type}`;
			default:
				return 'Compliance';
		}
	});

	function handleClose() {
		open = false;
		modalStore.close();
	}

	function handleSuccess(savedRecord: ComplianceRecord) {
		open = false;
		modalStore.close();
	}
</script>

<Modal bind:open={open} width="w-modal-wide">
	<div class="card p-6">
		<header class="card-header mb-6">
			<h3 class="h3 font-bold">{modalTitle}</h3>
		</header>

		<section class="card-body">
			<ComplianceForm
				{complianceRecord}
				{mode}
				onCancel={handleClose}
				onSuccess={handleSuccess}
			/>
		</section>
	</div>
</Modal>