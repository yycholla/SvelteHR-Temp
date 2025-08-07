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
	import { createLoginForm, getFieldProps } from '$lib/forms/login-form';
	import { trpc } from '$lib/trpc/client';
	import { User, Lock, Eye, EyeOff, Building2, Shield } from 'lucide-svelte';

	// Form setup
	const { form, errors, constraints, message, submitting, isSubmitting, enhance } = createLoginForm({
		onSuccess: (data) => {
			console.log('Login successful:', data.user.firstName);
		},
		onError: (error) => {
			console.error('Login error:', error);
		}
	});

	// UI state
	let showPassword = false;
	let isLoading = false;

	// Check if user is already authenticated
	onMount(async () => {
		try {
			await trpc.auth.me.query();
			// User is authenticated, redirect to dashboard
			const redirectTo = $page.url.searchParams.get('redirectTo') || '/dashboard';
			await goto(redirectTo, { replaceState: true });
		} catch (error) {
			// User not authenticated, show login form
			// Only log non-authentication errors to avoid spam
			if (error && typeof error === 'object' && 'code' in error && error.code !== 'UNAUTHORIZED') {
				console.error('Unexpected auth check error:', error);
			}
		}
	});

	// Toggle password visibility
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	// Demo credentials helper
	function fillDemoCredentials() {
		$form.username = 'admin';
		$form.password = 'admin123';
	}
</script>

<svelte:head>
	<title>Sign In - SvelteHR</title>
	<meta name="description" content="Sign in to your SvelteHR account" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<div class="mx-auto w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
				<Building2 class="w-8 h-8 text-white" />
			</div>
			<h1 class="text-3xl font-bold text-gray-900">Welcome back</h1>
			<p class="text-gray-600 mt-2">Sign in to your SvelteHR account</p>
		</div>

		<!-- Login Card -->
		<Card class="shadow-xl border-0">
			<CardHeader class="space-y-1 pb-6">
				<CardTitle class="text-2xl text-center">Sign In</CardTitle>
				<CardDescription class="text-center">
					Enter your credentials to access your HR dashboard
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-6">
				<!-- Demo Credentials Banner -->
				<div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Shield class="w-4 h-4 text-amber-600" />
							<span class="text-sm text-amber-800">Demo Account Available</span>
						</div>
						<Button 
							variant="ghost" 
							size="sm" 
							on:click={fillDemoCredentials}
							class="text-amber-700 hover:text-amber-900 h-6 px-2"
						>
							Use Demo
						</Button>
					</div>
				</div>

				<!-- Error Message -->
				{#if $message && $message.type === 'error'}
					<Alert variant="destructive">
						<AlertDescription>{$message.text}</AlertDescription>
					</Alert>
				{/if}

				<!-- Login Form -->
				<form method="POST" use:enhance class="space-y-4">
					<!-- Username Field -->
					<div class="space-y-2">
						<InputGroup
							label="Username"
							type="text"
							placeholder="Enter your username"
							prefixIcon={User}
							bind:value={$form.username}
							error={$errors.username?.[0]}
							required={$constraints.username?.required}
							disabled={$isSubmitting}
							autocomplete="username"
						/>
					</div>

					<!-- Password Field -->
					<div class="space-y-2">
						<InputGroup
							label="Password"
							type={showPassword ? 'text' : 'password'}
							placeholder="Enter your password"
							prefixIcon={Lock}
							bind:value={$form.password}
							error={$errors.password?.[0]}
							required={$constraints.password?.required}
							disabled={$isSubmitting}
							autocomplete="current-password"
						>
							<button
								slot="suffix"
								type="button"
								on:click={togglePasswordVisibility}
								class="text-gray-400 hover:text-gray-600 focus:outline-none"
								tabindex="-1"
							>
								{#if showPassword}
									<EyeOff class="w-4 h-4" />
								{:else}
									<Eye class="w-4 h-4" />
								{/if}
							</button>
						</InputGroup>
					</div>

					<!-- Remember Me -->
					<div class="flex items-center space-x-2">
						<Checkbox 
							id="rememberMe" 
							bind:checked={$form.rememberMe}
							disabled={$isSubmitting}
						/>
						<label for="rememberMe" class="text-sm text-gray-700">
							Remember me for 7 days
						</label>
					</div>

					<!-- Submit Button -->
					<Button 
						type="submit" 
						variant="default" 
						size="lg" 
						class="w-full"
						loading={$isSubmitting}
						disabled={$isSubmitting}
					>
						{#if $isSubmitting}
							Signing in...
						{:else}
							Sign In
						{/if}
					</Button>
				</form>

				<!-- Separator -->
				<div class="relative">
					<Separator />
					<div class="absolute inset-0 flex justify-center">
						<span class="bg-white px-2 text-sm text-gray-500">or</span>
					</div>
				</div>

				<!-- SSO Options -->
				<div class="space-y-3">
					<Button variant="outline" size="lg" class="w-full" disabled>
						<div class="flex items-center space-x-2">
							<svg class="w-5 h-5" viewBox="0 0 24 24">
								<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							<span>Continue with Google SSO</span>
						</div>
					</Button>

					<Button variant="outline" size="lg" class="w-full" disabled>
						<div class="flex items-center space-x-2">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.219-5.145 1.219-5.145s-.31-.62-.31-1.536c0-1.438.833-2.512 1.869-2.512.881 0 1.307.663 1.307 1.457 0 .887-.564 2.214-.854 3.444-.243 1.026.514 1.862 1.524 1.862 1.83 0 3.24-1.93 3.24-4.715 0-2.467-1.772-4.192-4.305-4.192-2.932 0-4.657 2.2-4.657 4.472 0 .887.341 1.837.766 2.354.084.099.096.187.071.29-.077.324-.248 1.001-.282 1.14-.043.183-.142.223-.328.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.527-2.29-1.156l-.622 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
							</svg>
							<span>Continue with Microsoft</span>
						</div>
					</Button>
				</div>

				<!-- Help Links -->
				<div class="text-center space-y-2">
					<a href="/forgot-password" class="text-sm text-primary-600 hover:text-primary-500">
						Forgot your password?
					</a>
					<div class="text-xs text-gray-500">
						Need help? Contact your HR administrator
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Demo Credentials Info -->
		<div class="mt-6 text-center">
			<div class="inline-flex items-center space-x-4 text-sm text-gray-600">
				<Badge variant="secondary">Demo Available</Badge>
				<span>Username: admin</span>
				<span>Password: admin123</span>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-8 text-center text-xs text-gray-500">
			<p>© 2025 SvelteHR. All rights reserved.</p>
			<div class="mt-2 space-x-4">
				<a href="/privacy" class="hover:text-gray-700">Privacy Policy</a>
				<a href="/terms" class="hover:text-gray-700">Terms of Service</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom gradient background */
	:global(body) {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
</style>