<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	export let open: boolean = false;
	export let title: string = '';
	export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
	export let closeOnEscape: boolean = true;
	export let closeOnBackdrop: boolean = true;
	export let showCloseButton: boolean = true;
	export let persistent: boolean = false; // Prevents closing
	export let loading: boolean = false;
	export let maxHeight: string | null = null;

	let modalElement: HTMLDivElement;
	let previouslyFocused: HTMLElement | null = null;

	// Size classes mapping
	const sizeClasses = {
		sm: 'modal--sm',
		md: 'modal--md',
		lg: 'modal--lg',
		xl: 'modal--xl',
		full: 'modal--full'
	};

	$: modalClasses = ['modal', sizeClasses[size], loading && 'modal--loading']
		.filter(Boolean)
		.join(' ');

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && closeOnEscape && !persistent) {
			handleClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && closeOnBackdrop && !persistent) {
			handleClose();
		}
	}

	// Handle close
	function handleClose() {
		if (persistent) return;

		dispatch('close');
		open = false;
	}

	// Focus management
	function trapFocus(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		const focusableElements = modalElement.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		const firstFocusable = focusableElements[0] as HTMLElement;
		const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

		if (event.shiftKey) {
			if (document.activeElement === firstFocusable) {
				event.preventDefault();
				lastFocusable.focus();
			}
		} else {
			if (document.activeElement === lastFocusable) {
				event.preventDefault();
				firstFocusable.focus();
			}
		}
	}

	// Lifecycle
	onMount(() => {
		return () => {
			// Restore focus when component is destroyed
			if (previouslyFocused) {
				previouslyFocused.focus();
			}
		};
	});

	// Handle open state changes
	$: if (open) {
		// Save currently focused element
		previouslyFocused = document.activeElement as HTMLElement;

		// Prevent body scroll
		document.body.style.overflow = 'hidden';

		// Focus first focusable element in modal
		setTimeout(() => {
			const firstFocusable = modalElement?.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			) as HTMLElement;
			firstFocusable?.focus();
		}, 100);
	} else {
		// Restore body scroll
		document.body.style.overflow = '';

		// Restore focus
		if (previouslyFocused) {
			previouslyFocused.focus();
			previouslyFocused = null;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="modal-backdrop"
		on:click={handleBackdropClick}
		on:keydown={trapFocus}
		role="presentation"
		transition:fade={{ duration: 200 }}
	>
		<div
			bind:this={modalElement}
			class={modalClasses}
			style:max-height={maxHeight}
			transition:fly={{ y: -50, duration: 300 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
		>
			{#if loading}
				<div class="modal__loading">
					<div class="modal__spinner">
						<svg class="animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							/>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
					</div>
				</div>
			{/if}

			{#if title || showCloseButton}
				<div class="modal__header">
					{#if title}
						<h2 id="modal-title" class="modal__title">
							{title}
						</h2>
					{/if}

					{#if showCloseButton && !persistent}
						<button type="button" class="modal__close" on:click={handleClose}>
							<span class="sr-only">Close modal</span>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<div class="modal__content">
				<slot />
			</div>

			{#if $$slots.footer}
				<div class="modal__footer">
					<slot name="footer" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="postcss">
	/* Backdrop */
	.modal-backdrop {
		@apply fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4;
	}

	/* Modal Container */
	.modal {
		@apply relative flex max-h-full flex-col overflow-hidden rounded-lg bg-white shadow-xl;
	}

	/* Size Variants */
	.modal--sm {
		@apply w-full max-w-sm;
	}

	.modal--md {
		@apply w-full max-w-md;
	}

	.modal--lg {
		@apply w-full max-w-2xl;
	}

	.modal--xl {
		@apply w-full max-w-4xl;
	}

	.modal--full {
		@apply h-full max-h-none w-full max-w-none rounded-none;
	}

	/* Loading Overlay */
	.modal__loading {
		@apply absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75;
	}

	.modal__spinner svg {
		@apply h-8 w-8 text-blue-600;
	}

	/* Header */
	.modal__header {
		@apply flex items-center justify-between border-b border-gray-200 p-6;
	}

	.modal__title {
		@apply text-lg font-semibold text-gray-900;
	}

	.modal__close {
		@apply rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500;
	}

	/* Content */
	.modal__content {
		@apply flex-1 overflow-y-auto p-6;
	}

	/* Footer */
	.modal__footer {
		@apply flex items-center justify-end space-x-3 border-t border-gray-200 bg-gray-50 px-6 py-4;
	}

	/* Loading state */
	.modal--loading .modal__content {
		@apply pointer-events-none opacity-50;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.modal-backdrop {
			@apply p-2;
		}

		.modal--sm,
		.modal--md,
		.modal--lg,
		.modal--xl {
			@apply w-full max-w-none;
		}

		.modal__header {
			@apply p-4;
		}

		.modal__content {
			@apply p-4;
		}

		.modal__footer {
			@apply px-4 py-3;
		}
	}

	/* Screen reader only class */
	.sr-only {
		@apply absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0;
		clip: rect(0, 0, 0, 0);
	}

	/* Animation for spinner */
	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
