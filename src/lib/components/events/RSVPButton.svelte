<script lang="ts">
	// RSVPButton Component
	// Feature: 019-we-need-to - Task T021
	// Purpose: RSVP action dropdown for event responses

	import type { RsvpStatus } from '$lib/graphql/types';
	import { RSVP_STATUS_LABELS } from '$lib/graphql/types';
	import { getRsvpStatusColor, getRsvpStatusIcon } from '$lib/utils/events';

	interface Props {
		currentStatus: RsvpStatus;
		onChange: (newStatus: RsvpStatus) => void | Promise<void>;
		disabled?: boolean;
		loading?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	const {
		currentStatus,
		onChange,
		disabled = false,
		loading = false,
		size = 'md'
	}: Props = $props();

	// Local state
	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();

	// All RSVP status options
	const statusOptions: RsvpStatus[] = ['accepted', 'declined', 'tentative', 'pending'];

	// Size classes
	const sizeClasses = {
		sm: 'px-2.5 py-1.5 text-xs',
		md: 'px-3 py-2 text-sm',
		lg: 'px-4 py-2.5 text-base'
	};

	// Derived values
	const buttonClasses = $derived(`
		inline-flex items-center gap-2 rounded-lg font-medium transition-all
		${sizeClasses[size]}
		${getRsvpStatusColor(currentStatus)}
		${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
		border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
	`);

	const currentLabel = $derived(RSVP_STATUS_LABELS[currentStatus]);
	const currentIcon = $derived(getRsvpStatusIcon(currentStatus));

	function toggleDropdown() {
		if (!disabled && !loading) {
			isOpen = !isOpen;
		}
	}

	function handleStatusChange(newStatus: RsvpStatus) {
		console.log('[RSVPButton] handleStatusChange called');
		console.log('[RSVPButton] newStatus:', newStatus);
		console.log('[RSVPButton] currentStatus:', currentStatus);
		console.log('[RSVPButton] disabled:', disabled);
		console.log('[RSVPButton] loading:', loading);

		if (newStatus !== currentStatus && !disabled && !loading) {
			console.log('[RSVPButton] Calling onChange handler');
			const result = onChange(newStatus);

			// If onChange returns a Promise, handle loading state
			if (result instanceof Promise) {
				console.log('[RSVPButton] onChange returned a Promise');
				result.finally(() => {
					console.log('[RSVPButton] Promise resolved, closing dropdown');
					isOpen = false;
				});
			} else {
				console.log('[RSVPButton] onChange returned synchronously');
				isOpen = false;
			}
		} else {
			console.log('[RSVPButton] Skipping onChange - status unchanged or button disabled');
		}
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
			buttonRef?.focus();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (isOpen && buttonRef && !buttonRef.contains(target)) {
			isOpen = false;
		}
	}

	// Close dropdown when clicking outside
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<svelte:window onkeydown={handleKeyPress} />

<div class="relative inline-block text-left">
	<!-- RSVP Button -->
	<button
		bind:this={buttonRef}
		type="button"
		class={buttonClasses}
		disabled={disabled || loading}
		onclick={toggleDropdown}
		aria-haspopup="true"
		aria-expanded={isOpen}
		data-testid="event-rsvp-button"
	>
		<span class="flex items-center gap-1.5">
			{#if loading}
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			{:else}
				<span>{currentIcon}</span>
			{/if}
			<span>{currentLabel}</span>
		</span>

		<!-- Dropdown Arrow -->
		{#if !disabled && !loading}
			<svg
				class="h-4 w-4 transition-transform {isOpen ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		{/if}
	</button>

	<!-- Dropdown Menu (appears above button) -->
	{#if isOpen && !disabled && !loading}
		<div
			class="absolute left-1/2 -translate-x-1/2 bottom-full z-[9999] mb-2 w-48 origin-bottom rounded-lg border border-gray-200 bg-white dark:bg-card dark:border-border shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none"
			role="menu"
			aria-orientation="vertical"
		>
			<div class="py-1">
				{#each statusOptions as status}
					{@const isActive = status === currentStatus}
					{@const label = RSVP_STATUS_LABELS[status]}
					{@const icon = getRsvpStatusIcon(status)}

					<button
						type="button"
						class="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors
							{isActive
							? 'bg-gray-100 dark:bg-accent font-medium text-gray-900 dark:text-foreground'
							: 'text-gray-700 dark:text-foreground hover:bg-gray-50 dark:hover:bg-accent'}
						"
						role="menuitem"
						onclick={() => handleStatusChange(status)}
					>
						<span class="flex h-5 w-5 items-center justify-center">
							{#if isActive}
								<svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{:else}
								<span>{icon}</span>
							{/if}
						</span>
						<span>{label}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
