import type { AssignmentType, DocumentAssignment } from '$lib/types/document';

export interface Employee {
	id: string;
	email: string;
	department_id?: string;
}

export interface Department {
	id: string;
	name: string;
}

export interface Team {
	id: string;
	name: string;
}

export interface AssignmentModalProps {
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
