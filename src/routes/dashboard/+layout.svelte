<script lang="ts">
	import HrAppSidebar from '$lib/components/hr-app-sidebar.svelte';
	import PageLoading from '$lib/components/ui/page-loading.svelte';
	import ClientOnly from '$lib/components/client-only.svelte';
	import TestModeBanner from '$lib/components/test-mode-banner.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { getEffectivePermissions } from '$lib/stores/permission-test.svelte';
	import { sidebarState } from '$lib/stores/sidebar.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Compute effective permissions (test mode or real)
	let permissions = $derived(getEffectivePermissions(data.permissions || []));

	// Initialize notifications - auth already validated server-side in hooks.server.ts
	onMount(() => {
		// Initialize notifications with server data
		if (data.notifications) {
			notificationStore.setNotifications(data.notifications);
		}

		// Connect to real-time notification stream
		notificationStore.connect();
	});

	// Cleanup on unmount
	onDestroy(() => {
		notificationStore.disconnect();
	});
</script>

<!-- Test Mode Banner (appears above everything when active) - client-only to prevent hydration issues -->
<ClientOnly>
	<TestModeBanner />
</ClientOnly>

<!-- Dashboard Layout: Fixed sidebar with content area -->
<!-- Auth is already validated server-side in hooks.server.ts, so no client-side check needed -->
<div class="min-h-screen bg-sidebar">
	<!-- Fixed Sidebar - stays constant across all dashboard routes -->
	<aside
		class="fixed left-0 top-0 z-10 h-full bg-sidebar transition-all duration-300 {sidebarState.isCollapsed
			? 'w-16'
			: 'w-64'}"
		aria-label="Main navigation"
	>
		<HrAppSidebar {permissions} systemName={data.systemName || 'MountainHR'} />
	</aside>

	<!-- Main Content Area - only this content changes between routes -->
	<div
		class="h-screen overflow-auto transition-all duration-300 {sidebarState.isCollapsed
			? 'ml-16'
			: 'ml-64'}"
	>
		<div class="pb-6 pl-3 pr-6 pt-6">
			<main
				class="min-h-[calc(100vh-3rem)] rounded-2xl bg-background shadow-sm border border-sidebar-border"
				aria-live="polite"
			>
				<!-- Page content with padding -->
				<div class="p-6">
					<div>
						{@render children()}
					</div>
				</div>
			</main>
		</div>
	</div>
</div>
