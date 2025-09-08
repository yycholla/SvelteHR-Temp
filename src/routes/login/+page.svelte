<!--
	GelDB Login Page
	
	Modern authentication page using GelDB built-in auth with magic link support.
	Redirects to GelDB auth UI for secure authentication flow.
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/geldb-auth.js';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount } from 'svelte';

	// Get data from page server load
	let { data } = $props();

	// Component state
	let isLoading = $state(false);
	let error = $state('');

	// Extract query parameters for user feedback
	const loginReason = $derived(data.loginReason);
	const errorMessage = $derived(data.errorMessage);
	const redirectTo = $derived(data.redirectTo);

	// Handle login button click
	async function handleLogin() {
		isLoading = true;
		error = '';

		try {
			// Redirect to custom magic link login
			await auth.login(redirectTo || undefined);
		} catch (err) {
			console.error('Login initiation failed:', err);
			error = err instanceof Error ? err.message : 'Failed to start authentication process';
			isLoading = false;
		}
	}

	// Set initial error from URL params
	onMount(() => {
		if (errorMessage) {
			error = getErrorMessage(errorMessage);
		}
	});

	// Convert error codes to user-friendly messages
	function getErrorMessage(errorCode: string): string {
		switch (errorCode) {
			case 'oauth_error':
				return 'Authentication failed. Please try again.';
			case 'missing_code':
				return 'Authentication was incomplete. Please try again.';
			case 'invalid_token':
				return 'Authentication token is invalid. Please try again.';
			case 'token_exchange_failed':
				return 'Authentication process failed. Please try again.';
			case 'sync_failed':
				return 'Account setup failed. Please contact support.';
			case 'service_unavailable':
				return 'Authentication service is temporarily unavailable. Please try again later.';
			case 'callback_failed':
				return 'Authentication callback failed. Please try again.';
			case 'logout_failed':
				return 'Logout encountered an issue, but you have been signed out.';
			case 'invalid_magic_link':
				return 'Invalid magic link. Please request a new one.';
			case 'magic_link_expired':
				return 'Magic link has expired. Please request a new one.';
			case 'magic_link_used':
				return 'Magic link has already been used. Please request a new one.';
			case 'magic_link_invalid':
				return 'Magic link is invalid or corrupted. Please request a new one.';
			case 'verification_timeout':
				return 'Magic link verification timed out. Please try again.';
			default:
				return 'An error occurred during authentication. Please try again.';
		}
	}

	// Get reason message for display
	function getReasonMessage(reason: string): string {
		switch (reason) {
			case 'expired':
				return 'Your session has expired. Please sign in again.';
			case 'logout':
				return 'You have been successfully signed out.';
			case 'unauthorized':
				return 'You need to sign in to access that page.';
			default:
				return '';
		}
	}
</script>

<svelte:head>
	<title>Sign In - SvelteHR</title>
	<meta name="description" content="Sign in to access your SvelteHR account using secure magic link authentication" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<!-- Header -->
		<div class="text-center">
			<div class="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6">
				<span class="text-primary-foreground font-bold text-2xl">HR</span>
			</div>
			<h1 class="text-3xl font-bold text-foreground">
				Welcome to SvelteHR
			</h1>
			<p class="mt-2 text-muted-foreground">
				Sign in with your email using secure magic link authentication
			</p>
		</div>

		<!-- Status Messages -->
		{#if loginReason}
			<div class="p-4 text-sm bg-blue-50 border border-blue-200 rounded-md text-blue-800">
				{getReasonMessage(loginReason)}
			</div>
		{/if}

		{#if error}
			<div 
				class="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
				role="alert"
				aria-live="polite"
			>
				{error}
			</div>
		{/if}

		<!-- GelDB Authentication -->
		<div class="bg-card border rounded-lg shadow-sm p-8">
			<div class="space-y-6">
				<!-- Authentication Info -->
				<div class="text-center space-y-4">
					<div class="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
						<svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
					</div>
					<div>
						<h2 class="text-lg font-semibold text-foreground">Secure Magic Link Authentication</h2>
						<p class="text-sm text-muted-foreground mt-1">
							Sign in securely with a magic link sent to your work email
						</p>
					</div>
				</div>

				<!-- Sign In Button -->
				<Button
					variant="primary"
					size="lg"
					class="w-full"
					loading={isLoading}
					disabled={isLoading}
					onclick={handleLogin}
				>
					{isLoading ? 'Opening sign-in page...' : 'Continue to Sign In'}
				</Button>

				<!-- How it Works -->
				<div class="text-center">
					<details class="text-sm text-muted-foreground">
						<summary class="cursor-pointer hover:text-foreground mb-2 inline-flex items-center gap-1">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
							How Magic Link Works
						</summary>
						<div class="space-y-2 p-3 bg-muted/50 rounded-md text-left">
							<div class="flex items-start gap-2">
								<span class="text-primary font-semibold">1.</span>
								<span>Enter your work email address</span>
							</div>
							<div class="flex items-start gap-2">
								<span class="text-primary font-semibold">2.</span>
								<span>Receive a secure sign-in link via email</span>
							</div>
							<div class="flex items-start gap-2">
								<span class="text-primary font-semibold">3.</span>
								<span>Click the link to instantly sign in</span>
							</div>
							<div class="flex items-start gap-2">
								<span class="text-primary font-semibold">✨</span>
								<span><strong>Secure:</strong> No passwords needed, links expire after 15 minutes</span>
							</div>
						</div>
					</details>
				</div>

				<!-- Provider Info -->
				{#if data.providerInfo}
					<div class="text-center text-xs text-muted-foreground">
						<p>
							Powered by secure GelDB authentication
							<br>
							<span class="inline-flex items-center gap-1 mt-1">
								<svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
								</svg>
								End-to-end encrypted • Multiple auth methods
							</span>
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Support Information -->
		<div class="text-center text-sm">
			<span class="text-muted-foreground">Need help accessing your account? </span>
			<a
				href="/support"
				class="text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
			>
				Contact IT Support
			</a>
		</div>

		<!-- Footer -->
		<div class="text-center text-xs text-muted-foreground">
			<p>
				By signing in, you agree to our
				<a href="/terms" class="text-primary hover:text-primary/80">Terms of Service</a>
				and
				<a href="/privacy" class="text-primary hover:text-primary/80">Privacy Policy</a>
			</p>
		</div>

		{#if redirectTo}
			<div class="text-center text-xs text-muted-foreground">
				<p>You'll be redirected to: <code class="bg-muted px-1 rounded">{redirectTo}</code></p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom focus styles for better accessibility */
	a:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 0.125rem;
	}

	/* Loading animation override for better UX */
	:global(.loading-spinner) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
