<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = $bindable(false),
		title = '',
		size = 'md',
		closeOnEscape = true,
		closeOnBackdrop = true,
		showCloseButton = true,
		persistent = false,
		loading = false,
		maxHeight = null,
		onclose = undefined,
		children,
		footer
	}: {
		open?: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		closeOnEscape?: boolean;
		closeOnBackdrop?: boolean;
		showCloseButton?: boolean;
		persistent?: boolean;
		loading?: boolean;
		maxHeight?: string | null;
		onclose?: (() => void) | undefined;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	} = $props();

	let modalElement = $state<HTMLDivElement>();
	let previouslyFocused = $state<HTMLElement | null>(null);

	// Size classes mapping
	const sizeClasses = {
		sm: 'modal--sm',
		md: 'modal--md',
		lg: 'modal--lg',
		xl: 'modal--xl',
		full: 'modal--full'
	};

	let modalClasses = $derived(
		['modal', sizeClasses[size], loading && 'modal--loading'].filter(Boolean).join(' ')
	);

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

		onclose?.();
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
	$effect(() => {
		if (open) {
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
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="modal-backdrop"
		onclick={handleBackdropClick}
		onkeydown={trapFocus}
		role="presentation"
		transition:fade={{ duration: 150 }}
	>
		<div
			bind:this={modalElement}
			class={modalClasses}
			style:max-height={maxHeight}
			transition:fly={{ y: -50, duration: 150 }}
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
						<button type="button" class="modal__close" onclick={handleClose}>
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
				{@render children?.()}
			</div>

			{#if footer}
				<div class="modal__footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}


