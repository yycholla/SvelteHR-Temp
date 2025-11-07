<script lang="ts">
	import HrAppSidebar from '$lib/components/hr-app-sidebar.svelte';
	import PageLoading from '$lib/components/ui/page-loading.svelte';
	import ClientOnly from '$lib/components/client-only.svelte';
	import TestModeBanner from '$lib/components/test-mode-banner.svelte';
	import { isAuthenticated } from '$lib/stores/auth';
	import { notificationStore } from '$lib/stores/notifications';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getEffectivePermissions, effectivePermissions } from '$lib/stores/permission-test';
	import { browser } from '$app/environment';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Compute effective permissions (test mode or real)
	let permissions = $derived(getEffectivePermissions(data.permissions || []));

	// Redirect to login if not authenticated - runs only on client
	onMount(() => {
		if (!$isAuthenticated) {
			goto('/login');
		} else {
			// Initialize notifications with server data
			if (data.notifications) {
				notificationStore.setNotifications(data.notifications);
			}

			// Connect to real-time notification stream
			notificationStore.connect();
		}
	});

	// Cleanup on unmount
	onDestroy(() => {
		notificationStore.disconnect();
	});
</script>

{#if $isAuthenticated}
	<!-- Test Mode Banner (appears above everything when active) - client-only to prevent hydration issues -->
	<ClientOnly>
		<TestModeBanner />
	</ClientOnly>

	<!-- Dashboard Layout: Fixed sidebar with content area -->
	<div class="min-h-screen bg-sidebar">
		<!-- Fixed Sidebar - stays constant across all dashboard routes -->
		<aside class="fixed left-0 top-0 z-10 h-full w-64 bg-sidebar" aria-label="Main navigation">
			<HrAppSidebar {permissions} />
		</aside>

		<!-- Main Content Area - only this content changes between routes -->
		<div class="ml-64 h-screen overflow-auto">
			<div class="pb-6 pl-3 pr-6 pt-6">
				<main
					class="min-h-[calc(100vh-3rem)] rounded-xl bg-background shadow-sm"
					aria-live="polite"
				>
					<!-- Page content with padding -->
					<div class="p-6">
						{@render children()}
					</div>
				</main>
			</div>
		</div>
	</div>
{:else}
	<!-- Loading state while authentication is being verified -->
	<div class="min-h-screen bg-background">
		<PageLoading
			title="Loading Dashboard"
			description="Verifying your authentication..."
			variant="detailed"
			fullScreen={true}
		/>
	</div>
{/if}
