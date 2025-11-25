import { mount } from 'svelte';

interface ConfirmOptions {
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'default' | 'destructive';
}

class ConfirmStore {
	isOpen = $state(false);
	title = $state('Confirm Action');
	message = $state('');
	confirmText = $state('Confirm');
	cancelText = $state('Cancel');
	variant = $state<'default' | 'destructive'>('default');
	
	private resolvePromise: ((value: boolean) => void) | null = null;

	ask(options: ConfirmOptions): Promise<boolean> {
		this.title = options.title || 'Confirm Action';
		this.message = options.message;
		this.confirmText = options.confirmText || 'Confirm';
		this.cancelText = options.cancelText || 'Cancel';
		this.variant = options.variant || 'default';
		this.isOpen = true;

		return new Promise((resolve) => {
			this.resolvePromise = resolve;
		});
	}

	confirm() {
		this.isOpen = false;
		if (this.resolvePromise) {
			this.resolvePromise(true);
			this.resolvePromise = null;
		}
	}

	cancel() {
		this.isOpen = false;
		if (this.resolvePromise) {
			this.resolvePromise(false);
			this.resolvePromise = null;
		}
	}
}

export const confirmService = new ConfirmStore();
