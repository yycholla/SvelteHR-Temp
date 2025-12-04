import { writable } from 'svelte/store';

interface ConfirmOptions {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'default' | 'destructive';
}

interface ConfirmState {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText: string;
	cancelText: string;
	variant: 'default' | 'destructive';
}

function createConfirmStore() {
	const defaultState: ConfirmState = {
		isOpen: false,
		title: 'Confirm Action',
		message: '',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		variant: 'default'
	};

	const { subscribe, set, update } = writable<ConfirmState>(defaultState);
	let resolvePromise: ((value: boolean) => void) | null = null;

	return {
		subscribe,
		ask(options: ConfirmOptions): Promise<boolean> {
			update((state) => ({
				...state,
				title: options.title || 'Confirm Action',
				message: options.message,
				confirmText: options.confirmText || 'Confirm',
				cancelText: options.cancelText || 'Cancel',
				variant: options.variant || 'default',
				isOpen: true
			}));

			return new Promise((resolve) => {
				resolvePromise = resolve;
			});
		},
		confirm() {
			update((state) => ({ ...state, isOpen: false }));
			if (resolvePromise) {
				resolvePromise(true);
				resolvePromise = null;
			}
		},
		cancel() {
			update((state) => ({ ...state, isOpen: false }));
			if (resolvePromise) {
				resolvePromise(false);
				resolvePromise = null;
			}
		}
	};
}

export const confirmService = createConfirmStore();
