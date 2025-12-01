<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	// Initialize PostGraphile GraphQL client for the entire app
	setContextClient(createUrqlClient());

	const { children, data } = $props();

	let mounted = $state(false);

	// Session timeout state
	let sessionTimeoutManager: SessionTimeoutManager | null = null;
	let showTimeoutBlur = $state(false);
	let timeoutToastId: string | number | undefined;
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	// Simplify layout logic to prevent reactive re-mounting issues
	const isAuthPage = $derived($page?.url?.pathname === '/login');
	const isPublicPage = $derived(isAuthPage || $page?.url?.pathname === '/');

	// Show timeout warning with Sonner
	function showTimeoutSonner(remainingSeconds: number) {
		const minutes = Math.floor(remainingSeconds / 60);
		const seconds = remainingSeconds % 60;

		timeoutToastId = toast.warning(
			`Session expiring in ${minutes}:${seconds.toString().padStart(2, '0')}`,
			{
				description: 'Click anywhere or press Continue to stay logged in',
				duration: Infinity,
				action: {
					label: 'Continue',
					onClick: () => {
						showTimeoutBlur = false;
						if (countdownInterval) {
							clearInterval(countdownInterval);
							countdownInterval = null;
						}
						sessionTimeoutManager?.refreshSession();
					}
				}
			}
		);

		// Update countdown every second
		countdownInterval = setInterval(() => {
			const remaining = sessionTimeoutManager?.getRemainingTime() || 0;
			if (remaining <= 0) {
				if (countdownInterval) {
					clearInterval(countdownInterval);
					countdownInterval = null;
				}
				return;
			}

			const min = Math.floor(remaining / 60);
			const sec = remaining % 60;
			toast.warning(`Session expiring in ${min}:${sec.toString().padStart(2, '0')}`, {
				id: timeoutToastId,
				description: 'Click anywhere or press Continue to stay logged in',
				duration: Infinity,
				action: {
					label: 'Continue',
					onClick: () => {
						showTimeoutBlur = false;
						if (countdownInterval) {
							clearInterval(countdownInterval);
							countdownInterval = null;
						}
						sessionTimeoutManager?.refreshSession();
					}
				}
			});
		}, 1000);
	}

	// Initialize session timeout on mount (only for authenticated pages)
	onMount(() => {
		mounted = true;

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
							if (countdownInterval) {
								clearInterval(countdownInterval);
								countdownInterval = null;
							}
						}
					},
					onSessionRefreshed: () => {
						console.log('⏱️ Session refreshed successfully');
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
		if (countdownInterval) {
			clearInterval(countdownInterval);
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
