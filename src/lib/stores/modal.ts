import { writable } from 'svelte/store';

export interface ModalConfig {
	component: any;
	props?: Record<string, any>;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	closeOnOutsideClick?: boolean;
}

interface ModalState {
	isOpen: boolean;
	config: ModalConfig | null;
}

function createModalStore() {
	const { subscribe, set, update } = writable<ModalState>({
		isOpen: false,
		config: null
	});

	return {
		subscribe,
		open: (config: ModalConfig) => {
			set({
				isOpen: true,
				config
			});
		},
		close: () => {
			set({
				isOpen: false,
				config: null
			});
		},
		update: (newConfig: Partial<ModalConfig>) => {
			update(state => ({
				...state,
				config: state.config ? { ...state.config, ...newConfig } : null
			}));
		}
	};
}

export const modalStore = createModalStore();

// Helper functions for common modal operations
export const openModal = (config: ModalConfig) => modalStore.open(config);
export const closeModal = () => modalStore.close();