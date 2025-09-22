<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { isAuthenticated, currentUser, authActions, isLoading } from '$lib/stores/auth';
	import { permissionsService } from '$lib/services/permissionsService';
	import AuthLayout from '$lib/components/auth/AuthLayout.svelte';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';

	/**
	 * Login Page
	 * Handles user authentication and redirects
	 */

	// Use session storage to prevent redirect loops across page reloads
	const LOGIN_REDIRECT_KEY = 'hr_login_redirected';

	// Check if user is already authenticated on mount
	onMount(async () => {
		// Check if we've already redirected in this session
		if (browser && sessionStorage.getItem(LOGIN_REDIRECT_KEY)) return;

		// Small delay to let AuthGuard initialize
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Check current auth state (already validated by AuthGuard)
		if ($isAuthenticated && $currentUser) {
			// Mark that we're redirecting to prevent loops
			if (browser) sessionStorage.setItem(LOGIN_REDIRECT_KEY, 'true');

			const redirectTo = $page.url.searchParams.get('redirect');
			if (redirectTo) {
				await goto(redirectTo, { replaceState: true });
			} else {
				// Redirect directly to appropriate dashboard to avoid loop with root page
				const user = $currentUser;
				const isAdmin = user && permissionsService.isSuperAdmin(user);
				await goto(isAdmin ? '/dashboard/admin' : '/dashboard', { replaceState: true });
			}
		}
	});

	// Clear redirect flag when navigating away from login
	$: if (browser && $page.url.pathname !== '/login') {
		sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
	}

	// Handle successful login
	const handleLoginSuccess = async (event: CustomEvent) => {
		// Clear all session storage flags on successful login
		if (browser) {
			sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
			sessionStorage.removeItem('hr_root_redirected');
			sessionStorage.removeItem('hr_login_success_redirected');
		}

		try {
			// Wait for auth state to fully load (including roles)
			console.log('Waiting for auth state to complete...');

			// Poll until loading is complete and user has full data
			let attempts = 0;
			const maxAttempts = 50; // 5 seconds max

			while (attempts < maxAttempts) {
				// Get current values from stores using get()
				const loading = get(isLoading);
				const user = get(currentUser);
				const authenticated = get(isAuthenticated);

				if (!loading && user && authenticated) {
					console.log('Auth state loaded, user:', user);
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
				attempts++;
			}

			if (attempts >= maxAttempts) {
				console.warn('Auth state loading timeout, proceeding with current state');
			}

			// Check if user is admin
			const user = $currentUser;
			let redirectTo = $page.url.searchParams.get('redirect');

			// Check for saved return URL from logout (highest priority)
			if (!redirectTo && browser) {
				const savedReturnUrl = localStorage.getItem('hr_return_url');
				if (savedReturnUrl) {
					console.log('Found saved return URL:', savedReturnUrl);
					redirectTo = savedReturnUrl;
					// Clear the saved URL after using it
					localStorage.removeItem('hr_return_url');
				}
			}

			// Only use role-based defaults if no URL was saved or provided
			if (!redirectTo) {
				// Redirect based on user role - now that roles are loaded
				if (user && permissionsService.isSuperAdmin(user)) {
					console.log('User is admin, no saved URL, redirecting to /dashboard/admin');
					redirectTo = '/dashboard/admin';
				} else {
					console.log('User is not admin, no saved URL, redirecting to /dashboard');
					redirectTo = '/dashboard';
				}
			}

			console.log('Redirecting to:', redirectTo);
			// Use replaceState to prevent navigation conflicts
			await goto(redirectTo, { replaceState: true });
		} catch (error) {
			console.error('Error during redirect:', error);
		}
	};

	// Handle login error
	const handleLoginError = (event: CustomEvent) => {
		console.error('Login error:', event.detail.message);
		// Error is already handled by the auth store and displayed in the form
	};
</script>

<svelte:head>
	<title>Sign In - SvelteHR</title>
	<meta
		name="description"
		content="Sign in to your SvelteHR account to access your HR dashboard."
	/>
</svelte:head>

<!-- Use AuthLayout for consistent branding -->
<AuthLayout title="SvelteHR" subtitle="Human Resources Management System">
	<!-- Use shadcn-style LoginForm -->
	<LoginForm on:success={handleLoginSuccess} on:error={handleLoginError} />
</AuthLayout>
