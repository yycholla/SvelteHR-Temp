<script lang="ts">
	import HrAppSidebar from '$lib/components/hr-app-sidebar.svelte';
	import { isAuthenticated } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Redirect to login if not authenticated - runs only on client
	onMount(() => {
		if (!$isAuthenticated) {
			goto('/login');
		}
	});
</script>

{#if $isAuthenticated}
	<!-- Dashboard Layout: Fixed sidebar with content area -->
	<div class="min-h-screen bg-sidebar">
		<!-- Fixed Sidebar - stays constant across all dashboard routes -->
		<aside class="fixed left-0 top-0 z-10 h-full w-64 bg-sidebar" aria-label="Main navigation">
			<HrAppSidebar />
		</aside>

		<!-- Main Content Area - only this content changes between routes -->
		<div class="ml-64 h-screen overflow-auto">
			<div class="pb-6 pl-3 pr-6 pt-6">
				<main class="min-h-[calc(100vh-3rem)] rounded-xl bg-background p-6 shadow-sm" aria-live="polite">
					<!-- This is where page content gets injected -->
					{@render children()}
				</main>
			</div>
		</div>
	</div>
{:else}
	<!-- Loading state while authentication is being verified -->
	<div
		class="flex min-h-screen items-center justify-center bg-background"
		role="status"
		aria-label="Loading dashboard"
	>
		<div class="flex flex-col items-center gap-4">
			<div
				class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"
				aria-hidden="true"
			></div>
			<p class="text-sm text-muted-foreground">Loading dashboard...</p>
		</div>
	</div>
{/if}
