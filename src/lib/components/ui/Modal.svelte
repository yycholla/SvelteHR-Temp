<!--
	Modal/Dialog Component
	
	Accessible modal dialog with backdrop, focus management, and keyboard navigation
	Supports various sizes and custom styling with proper ARIA attributes
	
	Usage:
	<Modal bind:open={showModal} title="Edit Employee" size="lg">
		{#snippet content()}
			<p>Modal content goes here</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="outline" onclick={() => showModal = false}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		{/snippet}
	</Modal>
-->

<script lang="ts">
	import { cn, flyAndScale } from '$lib/utils';
	import { onMount } from 'svelte';
	import Button from './Button.svelte';

	// Component props
	interface ModalProps {
		open?: boolean;
		title?: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		closable?: boolean;
		closeOnBackdrop?: boolean;
		closeOnEscape?: boolean;
		showHeader?: boolean;
		showFooter?: boolean;
		class?: string;
		backdropClass?: string;
		contentClass?: string;
		headerClass?: string;
		footerClass?: string;
		onClose?: () => void;
		onOpen?: () => void;
		content?: any;
		actions?: any;
		children?: any;
	}

	let {
		open = $bindable(false),
		title = '',
		description = '',
		size = 'md',
		closable = true,
		closeOnBackdrop = true,
		closeOnEscape = true,
		showHeader = true,
		showFooter = false,
		class: className = '',
		backdropClass = '',
		contentClass = '',
		headerClass = '',
		footerClass = '',
		onClose,
		onOpen,
		content,
		actions,
		children,
		...restProps
	}: ModalProps = $props();

	// Internal state
	let dialogElement: HTMLDialogElement;
	let previousActiveElement: Element | null = null;
	let isAnimating = $state(false);

	// Size classes
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		full: 'max-w-full h-full'
	};

	// Backdrop classes
	$: backdropClasses = cn(
		'fixed inset-0 z-50 flex items-center justify-center',
		'bg-background/80 backdrop-blur-sm',
		'data-[state=open]:animate-in data-[state=closed]:animate-out',
		'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
		backdropClass
	);

	// Content classes
	$: contentClasses = cn(
		'relative z-50 w-full mx-4 bg-background rounded-lg border shadow-lg',
		'data-[state=open]:animate-in data-[state=closed]:animate-out',
		'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
		'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
		'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
		'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
		sizeClasses[size],
		size === 'full' && 'mx-0 rounded-none',
		contentClass,
		className
	);

	// Header classes
	$: headerClasses = cn(
		'flex items-center justify-between p-6 pb-4',
		size === 'sm' && 'p-4 pb-2',
		headerClass
	);

	// Footer classes
	$: footerClasses = cn(
		'flex items-center justify-end gap-3 p-6 pt-4 border-t',
		size === 'sm' && 'p-4 pt-2',
		footerClass
	);

	// Handle modal open/close
	$: if (open) {
		openModal();
	} else {
		closeModal();
	}

	// Open modal
	function openModal() {
		if (isAnimating) return;
		
		isAnimating = true;
		
		// Store the previously focused element
		previousActiveElement = document.activeElement;
		
		// Prevent body scroll
		document.body.style.overflow = 'hidden';
		
		// Focus management
		setTimeout(() => {
			const firstFocusable = dialogElement?.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			) as HTMLElement;
			
			firstFocusable?.focus();
			isAnimating = false;
		}, 100);

		onOpen?.();
	}

	// Close modal
	function closeModal() {
		if (isAnimating) return;
		
		isAnimating = true;
		
		// Restore body scroll
		document.body.style.overflow = '';
		
		// Restore focus to previously focused element
		setTimeout(() => {
			if (previousActiveElement instanceof HTMLElement) {
				previousActiveElement.focus();
			}
			isAnimating = false;
		}, 200);

		onClose?.();
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (!closeOnBackdrop) return;
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// Handle close
	function handleClose() {
		if (closable && !isAnimating) {
			open = false;
		}
	}

	// Handle keyboard events
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && closeOnEscape) {
			event.preventDefault();
			handleClose();
		}

		// Trap focus within modal
		if (event.key === 'Tab') {
			trapFocus(event);
		}
	}

	// Focus trap
	function trapFocus(event: KeyboardEvent) {
		const focusableElements = dialogElement?.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) as NodeListOf<HTMLElement>;

		if (!focusableElements || focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (event.shiftKey) {
			// Shift + Tab
			if (document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			}
		} else {
			// Tab
			if (document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	// Cleanup on unmount
	onMount(() => {
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Generate unique IDs
	const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
	const descriptionId = description ? `modal-description-${Math.random().toString(36).substr(2, 9)}` : undefined;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
{#if open}
	<div
		class={backdropClasses}
		data-state="open"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<dialog
			bind:this={dialogElement}
			{...restProps}
			class={contentClasses}
			data-state="open"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? titleId : undefined}
			aria-describedby={descriptionId}
			open
		>
			{#if showHeader && (title || closable)}
				<header class={headerClasses}>
					<div class="flex flex-col gap-1">
						{#if title}
							<h2 id={titleId} class="text-lg font-semibold text-foreground">
								{title}
							</h2>
						{/if}
						{#if description}
							<p id={descriptionId} class="text-sm text-muted-foreground">
								{description}
							</p>
						{/if}
					</div>
					
					{#if closable}
						<button
							type="button"
							class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
							onclick={handleClose}
							aria-label="Close modal"
						>
							<svg
								class="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</button>
					{/if}
				</header>
			{/if}

			<div class="px-6 py-4 overflow-y-auto max-h-[70vh]" class:px-4={size === 'sm'} class:py-2={size === 'sm'}>
				{#if content}
					{@render content()}
				{:else}
					{@render children?.()}
				{/if}
			</div>

			{#if showFooter || actions}
				<footer class={footerClasses}>
					{#if actions}
						{@render actions()}
					{/if}
				</footer>
			{/if}
		</dialog>
	</div>
{/if}

<style>
	/* Override default dialog styles */
	dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: none;
		max-height: none;
	}

	dialog::backdrop {
		display: none;
	}

	/* Animation keyframes */
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fade-out {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	@keyframes zoom-in-95 {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes zoom-out-95 {
		from {
			opacity: 1;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(0.95);
		}
	}

	@keyframes slide-in-from-top-48 {
		from {
			transform: translateY(-48%);
		}
		to {
			transform: translateY(0);
		}
	}

	@keyframes slide-out-to-top-48 {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-48%);
		}
	}

	/* Apply animations */
	[data-state="open"] {
		animation: fade-in 150ms ease-out, zoom-in-95 150ms ease-out;
	}

	[data-state="closed"] {
		animation: fade-out 150ms ease-in, zoom-out-95 150ms ease-in;
	}
</style>