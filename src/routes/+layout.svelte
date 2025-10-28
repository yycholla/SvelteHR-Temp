<script lang="ts">
	import { page } from '$app/stores';
	import { authActions } from '$lib/stores/auth';
	import ToastContainer from '$lib/components/ui/toast-container.svelte';
	import { setContextClient } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { themeStore } from '$lib/stores/theme';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	// Initialize PostGraphile GraphQL client for the entire app
	setContextClient(createUrqlClient());

	let { children, data } = $props();

	// Sync server-validated user to client store immediately
	// This runs BEFORE any rendering happens
	if (data?.user?.id) {
		authActions.setUser({
			id: data.user.id,
			email: data.user.email,
			displayName: data.user.displayName || data.user.display_name || data.user.email?.split('@')[0] || 'User',
			onboardingStatus: 'Active',
			isActive: true
		});
	}

	// Simplify layout logic to prevent reactive re-mounting issues
	const isAuthPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/login-simple' || $page.url.pathname === '/login-working');
	const isPublicPage = $derived(isAuthPage || $page.url.pathname === '/' || $page.url.pathname === '/privacy' || $page.url.pathname === '/terms');

	// Apply theme to document
	$effect(() => {
		if (typeof document !== 'undefined') {
			const root = document.documentElement;
			root.classList.remove('light', 'dark');
			root.classList.add($themeStore.resolved);
		}
	});
</script>

<svelte:head>
	<title>SvelteHR - HR Management System</title>
	<meta name="description" content="Comprehensive HR management system for modern organizations" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Render app - server has already validated auth via hooks.server.ts -->
<main class="app-main">
	{@render children?.()}
</main>

<!-- Global toast notifications -->
<ToastContainer />

<style global>
	:global(.app-main) {
		min-height: 100vh;
		background-color: hsl(var(--sidebar));
	}

	/* Ensure consistent background with sidebar */
	:global(body) {
		background-color: hsl(var(--sidebar));
		color: hsl(var(--foreground));
	}

	/* Global styles merged */
	:global(html) {
		height: 100%;
	}

	:global(body) {
		height: 100%;
		margin: 0;
		/* Let Carbon design system handle font family */
	}

	:global(#app) {
		height: 100%;
	}

	.auth-layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f9fafb;
	}
</style>
