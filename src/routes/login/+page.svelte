<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { goto, replaceState } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { jwtAuth } from '$lib/stores/jwt-auth.svelte';
	import { toast } from 'svelte-sonner';
	import AuthLayout from '$lib/components/auth/AuthLayout.svelte';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import ClientOnly from '$lib/components/client-only.svelte';

	/**
	 * Login Page
	 * Handles user authentication and redirects
	 */

	// Use session storage to prevent redirect loops across page reloads
	const LOGIN_REDIRECT_KEY = 'hr_login_redirected';

	// Check if user is already authenticated on mount
	onMount(async () => {
		// Check for session timeout parameter
		const isTimeout = $page?.url?.searchParams.get('timeout') === 'true';
		if (isTimeout && browser) {
			toast.info('Your session expired due to inactivity', {
				description: 'Please log in again to continue',
				duration: 5000
			});
			// Clear the timeout parameter from URL
			const url = new URL(window.location.href);
			url.searchParams.delete('timeout');
			replaceState(url.toString(), {});
		}

		// Check if we've already redirected in this session
		if (browser && sessionStorage.getItem(LOGIN_REDIRECT_KEY)) return;

		// Small delay to let AuthGuard initialize
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Check current auth state (already validated by AuthGuard)
		if (auth.isAuthenticated && auth.user) {
			// Mark that we're redirecting to prevent loops
			if (browser) sessionStorage.setItem(LOGIN_REDIRECT_KEY, 'true');

			const redirectTo = $page?.url?.searchParams.get('redirect');
			if (redirectTo) {
				await goto(redirectTo, { replaceState: true });
			} else {
				// Redirect directly to dashboard to avoid loop with root page
				await goto('/dashboard', { replaceState: true });
			}
		}
	});

	// Clear redirect flag when navigating away from login
	$effect(() => {
		if (browser && $page?.url?.pathname !== '/login') {
			sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
		}
	});

	// Handle successful login
	const handleLoginSuccess = async (_event: CustomEvent) => {
		// Clear all session storage flags on successful login
		if (browser) {
			sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
			sessionStorage.removeItem('hr_root_redirected');
			sessionStorage.removeItem('hr_login_success_redirected');
		}

		try {
			// Synchronize JWT auth user to regular auth store
			if (jwtAuth.user) {
				await auth.setUser({
					id: jwtAuth.user.id,
					email: jwtAuth.user.email,
					displayName: jwtAuth.user.displayName || jwtAuth.user.email.split('@')[0],
					role: jwtAuth.user.roles?.[0] || 'Employee', // Take first role from array
					onboardingStatus: jwtAuth.user.onboardingStatus || 'Active',
					isActive: true
				});
				logger.info(`[Login] Auth user role set: ${auth.user?.role}`);
			} else {
				logger.error('[Login] No JWT user data available!');
			}

			// Wait for auth state to fully load (including roles)
			logger.info('Waiting for auth state to complete...');

			// Poll until loading is complete and user has full data
			let attempts = 0;
			const maxAttempts = 50; // 5 seconds max

			while (attempts < maxAttempts) {
				// Get current values from stores using get()
				const loading = auth.isLoading;
				const user = auth.user;
				const authenticated = auth.isAuthenticated;

				if (!loading && user && authenticated) {
					logger.info(`Auth state loaded, user: ${user}`);
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
				attempts++;
			}

			if (attempts >= maxAttempts) {
				logger.warn('Auth state loading timeout, proceeding with current state');
			}

			// Check if user is admin
			const user = auth.user;
			let redirectTo = $page?.url?.searchParams.get('redirect');

			// Check for saved return URL from logout (highest priority)
			if (!redirectTo && browser) {
				const savedReturnUrl = localStorage.getItem('hr_return_url');
				if (savedReturnUrl) {
					logger.info(`Found saved return URL: ${savedReturnUrl}`);
					redirectTo = savedReturnUrl;
					// Clear the saved URL after using it
					localStorage.removeItem('hr_return_url');
				}
			}

			// Only use role-based defaults if no URL was saved or provided
			if (!redirectTo) {
				// Redirect to dashboard for all users for now
				logger.info('No saved URL, redirecting to /dashboard');
				redirectTo = '/dashboard';
			}

			logger.info(`Redirecting to: ${redirectTo}`);
			// Use replaceState to prevent navigation conflicts
			await goto(redirectTo, { replaceState: true });
		} catch (error) {
			logger.error('Error during redirect:', error as Error);
		}
	};

	// Handle login error
	const handleLoginError = (event: CustomEvent) => {
		logger.error('Login error:', event.detail.message);
		// Error is already handled by the auth store and displayed in the form
	};
</script>

<svelte:head>
	<title>Sign In - MountainHR</title>
	<meta
		name="description"
		content="Sign in to your MountainHR account to access your HR dashboard."
	/>
</svelte:head>

<!-- Use AuthLayout for consistent branding -->
<AuthLayout title="MountainHR" subtitle="Human Resources Management System">
	<!-- Avoid input autofill hydration mismatches by mounting the interactive form only on client -->
	<ClientOnly>
		<LoginForm on:success={handleLoginSuccess} on:error={handleLoginError} />
	</ClientOnly>
</AuthLayout>
