<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { Activity, Bug, Clock, Shield, User } from '@lucide/svelte';

	// Performance tracking
	let pageLoadTime = $state(0);
	let navigationStart = $state(0);

	// Track page load times
	onMount(() => {
		if (typeof window !== 'undefined' && window.performance) {
			const perfData = window.performance.timing;
			navigationStart = perfData.navigationStart;
			pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

			// Update on navigation
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					if (entry.entryType === 'navigation') {
						const navEntry = entry as PerformanceNavigationTiming;
						pageLoadTime = Math.round(navEntry.loadEventEnd - navEntry.fetchStart);
					}
				}
			});
			observer.observe({ entryTypes: ['navigation'] });

			return () => observer.disconnect();
		}
	});

	// Format time
	function formatTime(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	// Get current page path
	const currentPath = $derived($page.url.pathname);

	// Get auth status
	const authStatus = $derived(auth.user ? 'Authenticated' : 'Not Authenticated');

	// Get user role
	const userRole = $derived(auth.user?.role || 'Unknown');

	// Get user email
	const userEmail = $derived(auth.user?.email || 'Not logged in');
</script>

<div class="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs">
	<div class="mb-2 flex items-center gap-2 border-b border-yellow-500/20 pb-2">
		<Bug class="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
		<span class="font-semibold text-yellow-700 dark:text-yellow-300">Debug Info</span>
	</div>

	<div class="space-y-2">
		<!-- User Info -->
		<div class="flex items-start gap-2">
			<User class="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-600/70 dark:text-yellow-400/70" />
			<div class="min-w-0 flex-1">
				<div class="font-medium text-yellow-700 dark:text-yellow-300">User</div>
				<div class="truncate text-yellow-600/80 dark:text-yellow-400/80">{userEmail}</div>
			</div>
		</div>

		<!-- Role -->
		<div class="flex items-start gap-2">
			<Shield class="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-600/70 dark:text-yellow-400/70" />
			<div>
				<div class="font-medium text-yellow-700 dark:text-yellow-300">Role</div>
				<div class="text-yellow-600/80 dark:text-yellow-400/80">{userRole}</div>
			</div>
		</div>

		<!-- Auth Status -->
		<div class="flex items-start gap-2">
			<Activity class="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-600/70 dark:text-yellow-400/70" />
			<div>
				<div class="font-medium text-yellow-700 dark:text-yellow-300">Auth Status</div>
				<div class="text-yellow-600/80 dark:text-yellow-400/80">{authStatus}</div>
			</div>
		</div>

		<!-- Current Page -->
		<div class="flex items-start gap-2">
			<Activity class="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-600/70 dark:text-yellow-400/70" />
			<div class="min-w-0 flex-1">
				<div class="font-medium text-yellow-700 dark:text-yellow-300">Current Page</div>
				<div class="truncate text-yellow-600/80 dark:text-yellow-400/80">{currentPath}</div>
			</div>
		</div>

		<!-- Page Load Time -->
		{#if pageLoadTime > 0}
			<div class="flex items-start gap-2">
				<Clock class="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-600/70 dark:text-yellow-400/70" />
				<div>
					<div class="font-medium text-yellow-700 dark:text-yellow-300">Page Load</div>
					<div class="text-yellow-600/80 dark:text-yellow-400/80">
						{formatTime(pageLoadTime)}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
