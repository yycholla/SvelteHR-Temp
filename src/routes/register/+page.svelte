<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Card,
		CardHeader,
		CardContent,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { InputGroup } from '$lib/components/ui/input';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { apiClient } from '$lib/api/client';
	import { showError, showSuccess } from '$lib/utils/errors';
	import { authActions, isAuthenticated } from '$lib/stores/auth';
	import { Building2, UserPlus, ArrowLeft } from 'lucide-svelte';

	// Form state
	let full_name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let isLoading = false;
	let error = '';

	// Check if user is already authenticated
	onMount(async () => {
		if ($isAuthenticated) {
			const redirectTo = $page.url.searchParams.get('redirectTo') || '/home';
			await goto(redirectTo, { replaceState: true });
		}
	});

	// Register new user
	async function handleRegister() {
		error = '';

		// Validation
		if (!full_name.trim()) {
			error = 'Full name is required';
			return;
		}
		if (!email || !email.includes('@')) {
			error = 'Please enter a valid email address';
			return;
		}
		if (password.length < 8) {
			error = 'Password must be at least 8 characters long';
			return;
		}
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		isLoading = true;

		try {
			const response = await apiClient.auth.register({
				full_name: full_name.trim(),
				email: email.toLowerCase().trim(),
				password
			});

			if (response.success && response.data) {
				// Set auth data in store
				authActions.setAuthData(response.data);

				showSuccess('Account created successfully! Welcome to SvelteHR.');

				// Redirect to intended destination
				const redirectTo = $page.url.searchParams.get('redirectTo') || '/home';
				await goto(redirectTo, { replaceState: true });
			} else {
				error = response.error || 'Registration failed';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Registration failed';
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
	<title>Create Account - SvelteHR</title>
	<meta name="description" content="Create your SvelteHR account" />
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-100/50 via-blue-100/40 to-blue-200/60 p-4 dark:from-yellow-900/20 dark:via-blue-900/25 dark:to-blue-800/30"
>
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-gradient-to-br from-primary to-primary/80 shadow-lg backdrop-blur-md"
			>
				<UserPlus class="h-8 w-8 text-primary-foreground" />
			</div>
			<h1
				class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-4xl font-bold text-transparent"
			>
				Join SvelteHR
			</h1>
			<p class="mt-3 text-lg text-muted-foreground">Create your account to get started</p>
		</div>

		<!-- Registration Form Card -->
		<Card class="rounded-2xl border border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader class="space-y-1 pb-4">
				<CardTitle
					class="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-center text-2xl text-transparent"
					>Create Account</CardTitle
				>
				<CardDescription class="text-center text-muted-foreground">
					Enter your details to create your SvelteHR account
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-6">
				<!-- Error Message -->
				{#if error}
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}

				<!-- Registration Form -->
				<form on:submit|preventDefault={handleRegister} class="space-y-4">
					<InputGroup>
						<label for="full_name" class="mb-2 block text-sm font-medium text-foreground"
							>Full Name</label
						>
						<input
							id="full_name"
							type="text"
							bind:value={full_name}
							placeholder="Enter your full name"
							required
							disabled={isLoading}
							class="w-full rounded-2xl border border-border/40 bg-background/20 px-4 py-3 text-foreground backdrop-blur-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
						/>
					</InputGroup>

					<InputGroup>
						<label for="email" class="mb-2 block text-sm font-medium text-foreground"
							>Email Address</label
						>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="Enter your email address"
							required
							disabled={isLoading}
							class="w-full rounded-2xl border border-border/40 bg-background/20 px-4 py-3 text-foreground backdrop-blur-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
						/>
					</InputGroup>

					<InputGroup>
						<label for="password" class="mb-2 block text-sm font-medium text-foreground"
							>Password</label
						>
						<input
							id="password"
							type="password"
							bind:value={password}
							placeholder="Create a password (8+ characters)"
							required
							disabled={isLoading}
							class="w-full rounded-2xl border border-border/40 bg-background/20 px-4 py-3 text-foreground backdrop-blur-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
						/>
					</InputGroup>

					<InputGroup>
						<label for="confirmPassword" class="mb-2 block text-sm font-medium text-foreground"
							>Confirm Password</label
						>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							placeholder="Confirm your password"
							required
							disabled={isLoading}
							class="w-full rounded-2xl border border-border/40 bg-background/20 px-4 py-3 text-foreground backdrop-blur-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
						/>
					</InputGroup>

					<Button
						type="submit"
						variant="default"
						size="lg"
						class="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
						disabled={isLoading || !full_name || !email || !password || !confirmPassword}
					>
						<UserPlus class="mr-2 h-4 w-4" />
						{#if isLoading}
							Creating Account...
						{:else}
							Create Account
						{/if}
					</Button>
				</form>

				<!-- Back to Login -->
				<div class="text-center">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="rounded-2xl text-muted-foreground hover:text-foreground"
						onclick={goBackToLogin}
					>
						<ArrowLeft class="mr-2 h-4 w-4" />
						Back to Sign In
					</Button>
				</div>
			</CardContent>
		</Card>

		<!-- Footer -->
		<div class="mt-8 text-center text-xs text-muted-foreground">
			<p>© 2025 SvelteHR. All rights reserved.</p>
			<div class="mt-2 space-x-4">
				<a href="/privacy" class="transition-colors duration-200 hover:text-foreground"
					>Privacy Policy</a
				>
				<a href="/terms" class="transition-colors duration-200 hover:text-foreground"
					>Terms of Service</a
				>
			</div>
		</div>
	</div>
</div>
