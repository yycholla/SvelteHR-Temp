<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { InputGroup } from '$lib/components/ui/input';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { apiClient } from '$lib/api/client';
	import { showError, showSuccess } from '$lib/utils/errors';
	import { authActions, authStore, isAuthenticated } from '$lib/stores/auth';
	import { Building2, Mail, ArrowLeft, CheckCircle } from 'lucide-svelte';

	// UI state
	let email = '';
	let isLoading = false;
	let error = '';
	let emailSent = false;

	// Check if user is already authenticated
	onMount(async () => {
		if ($isAuthenticated) {
			const redirectTo = $page.url.searchParams.get('redirectTo') || '/home';
			await goto(redirectTo, { replaceState: true });
		}

		// Check if there's a token in the URL (magic link verification)
		const token = $page.url.searchParams.get('token');
		if (token) {
			await verifyMagicLinkToken(token);
		}
	});

	// Send magic link to email
	async function sendMagicLink() {
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}

		error = '';
		isLoading = true;

		try {
			const response = await apiClient.auth.sendMagicLink(email);
			
			if (response.success) {
				emailSent = true;
				showSuccess(`Magic link sent to ${email}! Check your inbox.`);
			} else {
				error = response.error || 'Failed to send magic link';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send magic link';
		} finally {
			isLoading = false;
		}
	}

	// Verify magic link token from URL
	async function verifyMagicLinkToken(token: string) {
		isLoading = true;
		
		try {
			const response = await apiClient.auth.verifyMagicLink(token);
			
			if (response.success && response.data) {
				// Set auth data in store
				authActions.setAuthData(response.data);
				
				showSuccess('Successfully signed in with magic link!');
				
				// Redirect to intended destination
				const redirectTo = $page.url.searchParams.get('redirectTo') || '/home';
				await goto(redirectTo, { replaceState: true });
			} else {
				error = response.error || 'Invalid or expired magic link';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Magic link verification failed';
		} finally {
			isLoading = false;
		}
	}

	// Go back to main login
	function goBackToLogin() {
		goto('/login');
	}
</script>

<svelte:head>
	<title>Magic Link Sign In - SvelteHR</title>
	<meta name="description" content="Sign in to your SvelteHR account with a magic link" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<div class="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-md border border-border/40">
				<Mail class="w-8 h-8 text-primary-foreground" />
			</div>
			<h1 class="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Magic Link</h1>
			<p class="text-muted-foreground mt-3 text-lg">Passwordless sign-in to SvelteHR</p>
		</div>

		<!-- Magic Link Form Card -->
		<Card class="bg-background/20 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl">
			<CardHeader class="space-y-1 pb-4">
				<CardTitle class="text-2xl text-center bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
					{#if emailSent}
						Check Your Email
					{:else}
						Enter Your Email
					{/if}
				</CardTitle>
				<CardDescription class="text-center text-muted-foreground">
					{#if emailSent}
						We've sent a magic link to your email address
					{:else}
						We'll send you a secure link to sign in
					{/if}
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-6">
				<!-- Error Message -->
				{#if error}
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}

				{#if !emailSent}
					<!-- Email Input Form -->
					<form on:submit|preventDefault={sendMagicLink} class="space-y-4">
						<InputGroup>
							<input
								type="email"
								bind:value={email}
								placeholder="Enter your email address"
								required
								disabled={isLoading}
								class="w-full px-4 py-3 rounded-2xl border border-border/40 bg-background/20 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
							/>
						</InputGroup>

						<Button 
							type="submit"
							variant="default" 
							size="lg" 
							class="w-full rounded-2xl hover:scale-[1.02] transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl"
							disabled={isLoading || !email}
						>
							<Mail class="w-4 h-4 mr-2" />
							{#if isLoading}
								Sending Magic Link...
							{:else}
								Send Magic Link
							{/if}
						</Button>
					</form>
				{:else}
					<!-- Email Sent Success State -->
					<div class="text-center space-y-4">
						<div class="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
							<CheckCircle class="w-8 h-8 text-green-600 dark:text-green-400" />
						</div>
						
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-foreground">Magic Link Sent!</h3>
							<p class="text-sm text-muted-foreground">
								Check your inbox at <strong>{email}</strong> and click the link to sign in.
							</p>
							<p class="text-xs text-muted-foreground">
								The link will expire in 15 minutes for security.
							</p>
						</div>

						<Button
							type="button"
							variant="outline"
							size="sm"
							class="rounded-2xl"
							onclick={() => { emailSent = false; email = ''; error = ''; }}
						>
							Send to Different Email
						</Button>
					</div>
				{/if}

				<!-- Back to Login -->
				<div class="text-center">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="rounded-2xl text-muted-foreground hover:text-foreground"
						onclick={goBackToLogin}
					>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Back to Login Options
					</Button>
				</div>
			</CardContent>
		</Card>

		<!-- Info -->
		<div class="mt-6 text-center">
			<div class="inline-flex items-center space-x-4 text-sm text-muted-foreground bg-background/20 backdrop-blur-sm border border-border/40 rounded-2xl px-4 py-2 shadow-lg">
				<Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20">Secure</Badge>
				<span>No password required</span>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-8 text-center text-xs text-muted-foreground">
			<p>© 2025 SvelteHR. All rights reserved.</p>
			<div class="mt-2 space-x-4">
				<a href="/privacy" class="hover:text-foreground transition-colors duration-200">Privacy Policy</a>
				<a href="/terms" class="hover:text-foreground transition-colors duration-200">Terms of Service</a>
			</div>
		</div>
	</div>
</div>