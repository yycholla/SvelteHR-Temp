<script lang="ts">
	import DocumentAssignmentModal from '$lib/components/documents/assignment/DocumentAssignmentModal.svelte';
	import type { DocumentAssignment } from '$lib/types/document';

	interface Employee {
		id: string;
		email: string;
		department_id?: string;
	}

	interface Department {
		id: string;
		name: string;
	}

	interface Team {
		id: string;
		name: string;
	}

	interface Props {
		isOpen?: boolean;
		documentId: string;
		documentName: string;
		employees?: Employee[];
		departments?: Department[];
		teams?: Team[];
		existingAssignments?: DocumentAssignment[];
		onAssign?: (assignments: Partial<DocumentAssignment>[]) => void;
		onClose?: () => void;
		isSubmitting?: boolean;
	}

	const props: Props = $props();
</script>

<DocumentAssignmentModal {...props} />