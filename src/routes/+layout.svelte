<script lang="ts">
	// This import loads the Tailwind CSS styles from your app.postcss file.
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import { ToastContainer } from '$lib/components/ui/toast';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { authActions, isAuthenticated } from '$lib/stores/auth.svelte';

	let { children } = $props();

	// Initialize auth on app startup
	onMount(() => {
		authActions.initialize();
	});

	// Check if current route matches - only reactive to pathname changes
	const currentPath = $derived($page.url.pathname);

	// Don't show TopBar on login page
	const showTopBar = $derived(!currentPath.startsWith('/login'));

	// Page titles mapping
	const pageTitles: Record<string, string> = {
		'/': 'Dashboard',
		'/employees': 'Employees',
		'/calendar': 'Calendar',
		'/hr': 'HR Portal',
		'/admin': 'Admin Portal'
	};

	const pageTitle = $derived(pageTitles[currentPath] || '');

	function handleSearch(event: CustomEvent<{ query: string }>) {
		console.log('Search:', event.detail.query);
		// Implement global search functionality here
	}
</script>

<!-- Main Content Area -->
{#if showTopBar}
	<div
		class="flex h-screen flex-col bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30"
	>
		<!-- Top Bar - Conditional based on route -->
		<TopBar
			title={pageTitle}
			showNavigation={true}
			{currentPath}
			showSearch={currentPath !== '/'}
			on:search={handleSearch}
		/>

		<!-- Main Content -->
		<main class="flex-1 overflow-y-auto pt-20">
			{@render children?.()}
		</main>
	</div>
{:else}
	<!-- Login page without TopBar -->
	<main class="h-screen">
		{@render children?.()}
	</main>
{/if}

<!-- Toast Container - Always present for notifications -->
<ToastContainer />
