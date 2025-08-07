<script lang="ts">
	// This import loads the Tailwind CSS styles from your app.postcss file.
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	// Check if current route matches - only reactive to pathname changes
	const currentPath = $derived($page.url.pathname);
	
	// Page titles mapping
	const pageTitles: Record<string, string> = {
		'/': 'Dashboard',
		'/employees': 'Employees',
		'/calendar': 'Calendar',
		'/reports': 'Reports',
		'/settings': 'Settings'
	};
	
	const pageTitle = $derived(pageTitles[currentPath] || '');
	
	function handleSearch(event: CustomEvent<{query: string}>) {
		console.log('Search:', event.detail.query);
		// Implement global search functionality here
	}
</script>

<!-- Main Content Area with TopBar Navigation -->
<div class="h-screen flex flex-col bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30">
	<!-- Top Bar - Always visible with navigation -->
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
