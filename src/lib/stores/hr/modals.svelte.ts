// Migrated to Svelte 5 runes for better performance and reactivity

export interface ModalState {
	isOpen: boolean;
	type: 'employee' | 'task' | 'leave' | 'compliance' | 'document' | null;
	data: any;
	mode: 'create' | 'edit' | 'view';
}

const initialState: ModalState = {
	isOpen: false,
	type: null,
	data: null,
	mode: 'create'
};

// Svelte 5 runes-based modal store
let modalState = $state<ModalState>(initialState);

// Derived computed properties
export const isOpen = $derived(modalState.isOpen);
export const modalType = $derived(modalState.type);
export const modalData = $derived(modalState.data);
export const modalMode = $derived(modalState.mode);

// Derived computed values
export const isCreateMode = $derived(modalState.mode === 'create');
export const isEditMode = $derived(modalState.mode === 'edit');
export const isViewMode = $derived(modalState.mode === 'view');

export const isEmployeeModal = $derived(modalState.type === 'employee');
export const isTaskModal = $derived(modalState.type === 'task');
export const isLeaveModal = $derived(modalState.type === 'leave');
export const isComplianceModal = $derived(modalState.type === 'compliance');
export const isDocumentModal = $derived(modalState.type === 'document');

// Additional computed values for better UX
export const hasData = $derived(modalState.data !== null);
export const modalTitle = $derived(() => {
	if (!modalState.type) return '';
	
	const typeNames: Record<string, string> = {
		employee: 'Employee',
		task: 'Task',
		leave: 'Leave Request',
		compliance: 'Compliance',
		document: 'Document'
	};
	
	const typeName = typeNames[modalState.type] || modalState.type;
	const modeText = modalState.mode === 'create' ? 'Add' : 
					 modalState.mode === 'edit' ? 'Edit' : 'View';
	
	return `${modeText} ${typeName}`;
});

export const canEdit = $derived(modalState.mode === 'edit' || modalState.mode === 'create');
export const isReadOnly = $derived(modalState.mode === 'view');

// Store actions
export const modalActions = {
	open(type: ModalState['type'], data: any = null, mode: ModalState['mode'] = 'create') {
		modalState.isOpen = true;
		modalState.type = type;
		modalState.data = data;
		modalState.mode = mode;
	},

	close() {
		modalState.isOpen = false;
		modalState.type = null;
		modalState.data = null;
		modalState.mode = 'create';
	},

	reset() {
		// Reset to initial state
		Object.assign(modalState, initialState);
	},

	setMode(mode: ModalState['mode']) {
		modalState.mode = mode;
	},

	setData(data: any) {
		modalState.data = data;
	},

	// Specific modal type openers for better UX
	openEmployeeModal(data: any = null, mode: ModalState['mode'] = 'create') {
		this.open('employee', data, mode);
	},

	openTaskModal(data: any = null, mode: ModalState['mode'] = 'create') {
		this.open('task', data, mode);
	},

	openLeaveModal(data: any = null, mode: ModalState['mode'] = 'create') {
		this.open('leave', data, mode);
	},

	openComplianceModal(data: any = null, mode: ModalState['mode'] = 'create') {
		this.open('compliance', data, mode);
	},

	openDocumentModal(data: any = null, mode: ModalState['mode'] = 'create') {
		this.open('document', data, mode);
	},

	// Mode switching actions
	switchToCreateMode() {
		modalState.mode = 'create';
		modalState.data = null;
	},

	switchToEditMode(data: any) {
		modalState.mode = 'edit';
		modalState.data = data;
	},

	switchToViewMode(data: any) {
		modalState.mode = 'view';
		modalState.data = data;
	},

	// Update modal data while keeping it open
	updateData(newData: any) {
		modalState.data = { ...modalState.data, ...newData };
	}
};

// Combined modal store for backwards compatibility and convenience
export const modalStore = {
	// Provide reactive access to state
	get state() {
		return {
			isOpen: isOpen,
			type: modalType,
			data: modalData,
			mode: modalMode
		};
	},

	// Actions
	...modalActions
};