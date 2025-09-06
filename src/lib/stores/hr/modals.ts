import { writable, derived } from 'svelte/store';

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

// Traditional Svelte store
const modalState = writable<ModalState>(initialState);

// Derived stores for computed properties
export const isOpen = derived(modalState, $state => $state.isOpen);
export const modalType = derived(modalState, $state => $state.type);
export const modalData = derived(modalState, $state => $state.data);
export const modalMode = derived(modalState, $state => $state.mode);

// Derived computed values
export const isCreateMode = derived(modalState, $state => $state.mode === 'create');
export const isEditMode = derived(modalState, $state => $state.mode === 'edit');
export const isViewMode = derived(modalState, $state => $state.mode === 'view');

export const isEmployeeModal = derived(modalState, $state => $state.type === 'employee');
export const isTaskModal = derived(modalState, $state => $state.type === 'task');
export const isLeaveModal = derived(modalState, $state => $state.type === 'leave');
export const isComplianceModal = derived(modalState, $state => $state.type === 'compliance');
export const isDocumentModal = derived(modalState, $state => $state.type === 'document');

// Store actions
export const modalActions = {
	open(type: ModalState['type'], data: any = null, mode: ModalState['mode'] = 'create') {
		modalState.update(state => ({
			...state,
			isOpen: true,
			type,
			data,
			mode
		}));
	},

	close() {
		modalState.update(state => ({
			...state,
			isOpen: false,
			type: null,
			data: null,
			mode: 'create'
		}));
	},

	reset() {
		modalState.set(initialState);
	},

	setMode(mode: ModalState['mode']) {
		modalState.update(state => ({
			...state,
			mode
		}));
	},

	setData(data: any) {
		modalState.update(state => ({
			...state,
			data
		}));
	}
};

// Combined modal store for backwards compatibility
export const modalStore = {
	// Store subscription
	subscribe: modalState.subscribe,
	
	// Actions
	...modalActions
};