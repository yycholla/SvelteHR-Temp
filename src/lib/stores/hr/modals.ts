// Modernized to use Svelte 5 runes instead of Svelte 4 writable stores

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
		Object.assign(modalState, initialState);
	},

	setMode(mode: ModalState['mode']) {
		modalState.mode = mode;
	},

	setData(data: any) {
		modalState.data = data;
	}
};