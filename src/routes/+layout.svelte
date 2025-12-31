<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import ToastContainer from '$lib/components/ui/toast-container.svelte';
	import { Toaster } from 'svelte-sonner';
	import { setContextClient } from '@urql/svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { ModeWatcher } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { type SessionTimeoutManager, initSessionTimeout } from '$lib/services/session-timeout';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { initializeCommands } from '$lib/command-palette';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { sidebarState } from '$lib/stores/sidebar.svelte';

	// Initialize PostGraphile GraphQL client for the entire app
	setContextClient(createUrqlClient());

	const { children, data } = $props();

	let mounted = $state(false);

	// Session timeout state
	let sessionTimeoutManager: SessionTimeoutManager | null = null;
	let showTimeoutBlur = $state(false);
	let timeoutToastId: string | number | undefined;

	// Simplify layout logic to prevent reactive re-mounting issues
	const isAuthPage = $derived($page?.url?.pathname === '/login');
	const isPublicPage = $derived(isAuthPage || $page?.url?.pathname === '/');

	// Show/update timeout warning with Sonner
	function showTimeoutSonner(remainingSeconds: number) {
		const minutes = Math.floor(remainingSeconds / 60);
		const seconds = remainingSeconds % 60;

		// Create or update the toast with the same ID
		timeoutToastId = toast.warning(
			`Session expiring in ${minutes}:${seconds.toString().padStart(2, '0')}`,
			{
				id: timeoutToastId, // Reuse the same toast ID to update instead of creating new
				description: 'Click anywhere or press Continue to stay logged in',
				duration: Infinity,
				action: {
					label: 'Continue',
					onClick: () => {
						showTimeoutBlur = false;
						sessionTimeoutManager?.refreshSession();
					}
				}
			}
		);
	}

	// Initialize session timeout on mount (only for authenticated pages)
	onMount(() => {
		mounted = true;
		sidebarState.init();

		// Initialize command palette commands
		initializeCommands();

		// Sync server-validated user to client store (non-blocking)
		if (data?.user?.id) {
			auth.setUser({
				id: data.user.id,
				email: data.user.email,
				displayName: data.user.display_name || data.user.email?.split('@')[0] || 'User',
				onboardingStatus: 'Active',
				isActive: true
			});
		}

		// Only initialize session timeout if user is logged in
		if (data?.user?.id && !isPublicPage) {
			sessionTimeoutManager = initSessionTimeout(
				{
					inactivityTimeout: 30, // 30 minutes
					warningTime: 5, // 5 minutes warning
					refreshInterval: 10, // Refresh every 10 minutes
					enabled: true
				},
				{
					onWarning: (remainingSeconds) => {
						showTimeoutBlur = true;
						showTimeoutSonner(remainingSeconds);
					},
					onTimeout: async () => {
						// Cleanup will happen in the logout
					},
					onActivityDetected: () => {
						// Clear blur and dismiss toast on ANY activity
						if (showTimeoutBlur) {
							showTimeoutBlur = false;
							if (timeoutToastId) {
								toast.dismiss(timeoutToastId);
								timeoutToastId = undefined;
							}
						}
					},
					onSessionRefreshed: () => {
						logger.info('⏱️ Session refreshed successfully');
					}
				}
			);
		}
	});

	// Cleanup on unmount
	onDestroy(() => {
		if (sessionTimeoutManager) {
			sessionTimeoutManager.stop();
			sessionTimeoutManager = null;
		}
		if (timeoutToastId) {
			toast.dismiss(timeoutToastId);
		}
	});
</script>

<svelte:head>
	<title>MountainHR - HR Management System</title>
	<meta name="description" content="Comprehensive HR management system for modern organizations" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Mode Watcher handles theme initialization and prevents hydration flash -->
<ModeWatcher />

<!-- Render app - server has already validated auth via hooks.server.ts -->
<main>
	{#if children}
		{@render children()}
	{/if}
</main>

<!-- Session timeout blur overlay -->
{#if showTimeoutBlur}
	<div class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"></div>
{/if}

<!-- Global confirm dialog -->
{#if mounted}
	<ConfirmDialog />
{/if}

<!-- Command Palette (Cmd+K / Ctrl+K) -->
{#if mounted && data?.user}
	<CommandPalette userPermissions={[]} />
{/if}

<!-- Global toast notifications -->
<ToastContainer />
<Toaster position="bottom-center" />

<style global>
	:global(.app-main) {
		min-height: 100vh;
	}

	/* Ensure consistent background with sidebar */
	:global(body) {
		background-color: hsl(var(--background));
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
</style>
