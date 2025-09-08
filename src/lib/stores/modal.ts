// Modernized to use Svelte 5 runes instead of Svelte 4 writable stores

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

const initialState: ModalState = {
	isOpen: false,
	config: null
};

// Svelte 5 runes-based modal store
let modalState = $state<ModalState>(initialState);

// Derived computed properties
export const isOpen = $derived(modalState.isOpen);
export const config = $derived(modalState.config);

// Computed derived values
export const modalTitle = $derived(modalState.config?.title || '');
export const modalSize = $derived(modalState.config?.size || 'md');
export const modalComponent = $derived(modalState.config?.component);
export const modalProps = $derived(modalState.config?.props || {});
export const closeOnOutsideClick = $derived(modalState.config?.closeOnOutsideClick ?? true);

// Store actions
export const modalActions = {
	open(config: ModalConfig) {
		modalState.isOpen = true;
		modalState.config = config;
	},

	close() {
		modalState.isOpen = false;
		modalState.config = null;
	},

	update(newConfig: Partial<ModalConfig>) {
		if (modalState.config) {
			modalState.config = { ...modalState.config, ...newConfig };
		}
	},

	reset() {
		Object.assign(modalState, initialState);
	}
};

// Helper functions for common modal operations (maintain API compatibility)
export const openModal = (config: ModalConfig) => modalActions.open(config);
export const closeModal = () => modalActions.close();
