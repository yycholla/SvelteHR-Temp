import { writable } from 'svelte/store';

export interface ModalState {
	isOpen: boolean;
	type: 'employee' | 'task' | 'leave' | 'compliance' | 'document' | null;
	data: any;
	mode: 'create' | 'edit' | 'view';
}

function createModalStore() {
	const { subscribe, set, update } = writable<ModalState>({
		isOpen: false,
		type: null,
		data: null,
		mode: 'create'
	});

	return {
		subscribe,
		open: (type: ModalState['type'], data: any = null, mode: ModalState['mode'] = 'create') => {
			set({ isOpen: true, type, data, mode });
		},
		close: () => {
			set({ isOpen: false, type: null, data: null, mode: 'create' });
		},
		reset: () => {
			set({ isOpen: false, type: null, data: null, mode: 'create' });
		}
	};
}

export const modalStore = createModalStore();