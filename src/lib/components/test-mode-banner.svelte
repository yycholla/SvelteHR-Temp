<script lang="ts">
	import { AlertTriangle, X } from '@lucide/svelte';
	import {
		hydrateFromStorage,
		isTestModeActive,
		permissionTestActions,
		testRoleName
	} from '$lib/stores/permission-test.svelte';
	import { onMount } from 'svelte';

	// Hydrate state from localStorage on mount
	onMount(() => {
		hydrateFromStorage();
	});

	// Derived reactive values using runes
	const isActive = $derived(isTestModeActive());
	const roleName = $derived(testRoleName());

	function handleReset() {
		permissionTestActions.endTestMode();
	}
</script>

{#if isActive}
	<div
		class="test-mode-banner fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 shadow-lg"
	>
		<div class="mx-auto flex items-center justify-between px-6 py-3">
			<div class="flex items-center gap-3">
				<AlertTriangle class="h-5 w-5 flex-shrink-0" />
				<div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
					<span class="font-semibold">Testing Permissions</span>
					<span class="text-sm">
						Viewing system as <strong class="font-bold">{roleName}</strong> role
					</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<div class="hidden text-sm md:block">
					<span class="opacity-90">
						UI preview only • Server still validates your actual permissions
					</span>
				</div>
				<button
					onclick={handleReset}
					class="flex items-center gap-2 rounded-md bg-amber-950 px-4 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-amber-900"
				>
					<X class="h-4 w-4" />
					<span>Reset to My Permissions</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Add padding to body when banner is visible to prevent content jump */
	:global(body:has(.test-mode-banner)) {
		padding-top: 3.5rem;
	}
</style>
