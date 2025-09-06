<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { InputGroup } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { authActions, authStore, isAuthenticated } from '$lib/stores/auth';
	import { Building2, Shield, LogIn, UserPlus } from 'lucide-svelte';

	// UI state
	let error = '';

	// Subscribe to auth store
	$: isLoading = $authStore.isLoading;

	// Check if user is already authenticated
	onMount(async () => {
		if ($isAuthenticated) {
			// User is authenticated, redirect to home
			const redirectTo = $page.url.searchParams.get('redirectTo') || '/home';
			await goto(redirectTo, { replaceState: true });
		}
	});

	// Form state for traditional login
	let email = '';
	let password = '';
	let showLoginForm = false;

	// Handle direct sign in
	async function handleSignIn() {
		error = '';
		
		if (showLoginForm) {
			// Traditional email/password login
			if (!email || !password) {
				error = 'Please enter both email and password';
				return;
			}

			const result = await authActions.loginWithCredentials(email, password);
			
			if (!result.success) {
				error = result.error || 'Login failed';
			}
		} else {
			// Try GelDB redirect (if it becomes available later)
			const result = await authActions.signIn();
			
			if (!result.success) {
				// Fallback to showing login form if GelDB redirect fails
				showLoginForm = true;
				error = '';
			}
		}
	}

	// Handle GelDB sign up
	async function handleSignUp() {
		error = '';
		const result = await authActions.signUp();
		
		if (!result.success) {
			error = result.error || 'Sign-up redirect failed';
		}
	}

	// Toggle between magic link and traditional login
	function toggleLoginForm() {
		showLoginForm = !showLoginForm;
		error = '';
		email = '';
		password = '';
	}
</script>

<svelte:head>
	<title>Sign In - SvelteHR</title>
	<meta name="description" content="Sign in to your SvelteHR account" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<div class="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-md border border-border/40">
				<Building2 class="w-8 h-8 text-primary-foreground" />
			</div>
			<h1 class="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Welcome back</h1>
			<p class="text-muted-foreground mt-3 text-lg">Sign in to your SvelteHR account</p>
		</div>

		<!-- GelDB Auth Info Card -->
		<Card class="bg-background/30 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl mb-4">
			<CardContent class="p-4">
				<div class="flex items-center space-x-3">
					<Shield class="w-5 h-5 text-primary" />
					<span class="text-sm text-foreground font-medium">Secure authentication powered by GelDB</span>
				</div>
			</CardContent>
		</Card>

		<!-- Login Form Card -->
		<Card class="bg-background/20 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl">
			<CardHeader class="space-y-1 pb-4">
				<CardTitle class="text-2xl text-center bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Sign In</CardTitle>
				<CardDescription class="text-center text-muted-foreground">
					Enter your credentials to access your HR portal
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-6">
				<!-- Error Message -->
				{#if error}
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}

				{#if showLoginForm}
					<!-- Traditional Login Form -->
					<form on:submit|preventDefault={handleSignIn} class="space-y-4">
						<InputGroup>
							<label for="email" class="block text-sm font-medium text-foreground mb-2">Email</label>
							<input
								id="email"
								type="email"
								bind:value={email}
								placeholder="Enter your email address"
								required
								disabled={isLoading}
								class="w-full px-4 py-3 rounded-2xl border border-border/40 bg-background/20 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
							/>
						</InputGroup>

						<InputGroup>
							<label for="password" class="block text-sm font-medium text-foreground mb-2">Password</label>
							<input
								id="password"
								type="password"
								bind:value={password}
								placeholder="Enter your password"
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
							disabled={isLoading || !email || !password}
						>
							<LogIn class="w-4 h-4 mr-2" />
							{#if isLoading}
								Signing in...
							{:else}
								Sign In
							{/if}
						</Button>

						<!-- Toggle back to magic link -->
						<Button 
							type="button"
							variant="ghost" 
							size="sm" 
							class="w-full rounded-2xl text-muted-foreground hover:text-foreground"
							onclick={toggleLoginForm}
						>
							← Back to Magic Link
						</Button>
					</form>
				{:else}
					<!-- Magic Link Authentication -->
					<div class="space-y-4">
						<!-- Magic Link Sign In Button -->
						<Button 
							type="button"
							variant="default" 
							size="lg" 
							class="w-full rounded-2xl hover:scale-[1.02] transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 shadow-lg hover:shadow-xl"
							disabled={isLoading}
							onclick={handleSignIn}
						>
							<LogIn class="w-4 h-4 mr-2" />
							{#if isLoading}
								Processing...
							{:else}
								Sign In with Magic Link
							{/if}
						</Button>

						<!-- Traditional Login Option -->
						<Button 
							type="button"
							variant="outline" 
							size="lg" 
							class="w-full rounded-2xl hover:scale-[1.02] transition-all duration-200 bg-background/20 backdrop-blur-sm border-border/40 hover:bg-background/30"
							disabled={isLoading}
							onclick={toggleLoginForm}
						>
							<LogIn class="w-4 h-4 mr-2" />
							Sign In with Email & Password
						</Button>

						<!-- Sign Up Button -->
						<Button 
							type="button"
							variant="ghost" 
							size="sm" 
							class="w-full rounded-2xl text-muted-foreground hover:text-foreground"
							disabled={isLoading}
							onclick={handleSignUp}
						>
							<UserPlus class="w-4 h-4 mr-2" />
							Create New Account
						</Button>
					</div>
				{/if}

				<!-- Help Links -->
				<div class="text-center space-y-2">
					<div class="text-xs text-muted-foreground">
						Having trouble signing in? Contact your HR administrator for assistance.
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- GelDB Auth Info -->
		<div class="mt-6 text-center">
			<div class="inline-flex items-center space-x-4 text-sm text-muted-foreground bg-background/20 backdrop-blur-sm border border-border/40 rounded-2xl px-4 py-2 shadow-lg">
				<Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20">Magic Link</Badge>
				<span>Secure passwordless authentication</span>
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

