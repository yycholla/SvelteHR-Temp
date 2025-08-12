<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton';
	import { modalStore } from '$lib/stores/hr/modals';
	import LeaveForm from '../forms/LeaveForm.svelte';

	interface LeaveRequest {
		id?: string;
		employee_id: string;
		type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
		start_date: string;
		end_date: string;
		reason: string;
		notes?: string;
		status?: 'pending' | 'approved' | 'denied';
		created_at?: string;
		updated_at?: string;
	}

	let { 
		open = $bindable(false),
		leaveRequest = $bindable<LeaveRequest | null>(null),
		mode = $bindable<'create' | 'edit' | 'view'>('create')
	}: {
		open: boolean;
		leaveRequest?: LeaveRequest | null;
		mode?: 'create' | 'edit' | 'view';
	} = $props();

	const modalTitle = $derived(() => {
		switch (mode) {
			case 'create':
				return 'Submit Leave Request';
			case 'edit':
				return 'Edit Leave Request';
			case 'view':
				return 'Leave Request Details';
			default:
				return 'Leave Request';
		}
	});

	function handleClose() {
		open = false;
		modalStore.close();
	}

	function handleSuccess(savedLeaveRequest: LeaveRequest) {
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
			<LeaveForm
				{leaveRequest}
				{mode}
				onCancel={handleClose}
				onSuccess={handleSuccess}
			/>
		</section>
	</div>
</Modal>