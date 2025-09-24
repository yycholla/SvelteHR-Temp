<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { isAuthenticated, authActions } from '$lib/stores/auth';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import { setContextClient } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { theme } from '$lib/stores/theme';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	// Initialize PostGraphile GraphQL client for the entire app
	setContextClient(createUrqlClient());

	let { children } = $props();

	// Simplify layout logic to prevent reactive re-mounting issues
	const isAuthPage = $derived($page.url.pathname === '/login');
	const shouldShowLayout = $derived(!isAuthPage);

	// Debug layout changes
	$effect(() => {
		console.log(`🔵 Root layout reactive update:`, {
			pathname: $page.url.pathname,
			isAuthPage,
			shouldShowLayout,
			isAuthenticated: $isAuthenticated
		});
	});

	// Apply theme to document
	$effect(() => {
		if (typeof document !== 'undefined') {
			const root = document.documentElement;
			root.classList.remove('light', 'dark');

			if ($theme === 'system') {
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				root.classList.add(prefersDark ? 'dark' : 'light');
			} else {
				root.classList.add($theme);
			}
		}
	});

	// Removed token refresh interval since PostGraphile uses long-lived JWTs
	// The AuthGuard component handles initial session validation
</script>

<svelte:head>
	<title>SvelteHR - HR Management System</title>
	<meta name="description" content="Comprehensive HR management system for modern organizations" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Wrap entire app with AuthGuard for auth initialization -->
<AuthGuard>
	<!-- Always render children - let individual routes handle their own layout -->
	<main class="app-main">
		{@render children?.()}
	</main>
</AuthGuard>

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
