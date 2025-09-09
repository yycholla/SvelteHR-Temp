<script lang="ts">
	import {
		Card,
		CardHeader,
		CardContent,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { InputGroup } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	// Removed dependency on missing form library
	import { User, Lock, Eye, EyeOff, Building2, Shield } from 'lucide-svelte';

	// Simple form state
	let errors = $state({ username: '', password: '' });
	let isSubmitting = $state(false);
	let message = $state(null);

	// UI state
	let showPassword = $state(false);
	let formData = $state({ username: '', password: '', rememberMe: false });

	// Toggle password visibility
	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	// Demo credentials helper
	function fillDemoCredentials() {
		formData.username = 'admin';
		formData.password = 'admin123';
	}

	// Handle form submission
	async function onSubmit() {
		isSubmitting = true;
		errors = { username: '', password: '' };

		// Simple validation
		if (!formData.username) {
			errors.username = 'Username is required';
		}
		if (!formData.password) {
			errors.password = 'Password is required';
		}

		if (errors.username || errors.password) {
			isSubmitting = false;
			return;
		}

		// Simulate API call
		setTimeout(() => {
			isSubmitting = false;
			if (formData.username === 'admin' && formData.password === 'admin123') {
				message = { type: 'success', text: 'Login successful!' };
				console.log('Login successful:', formData);
			} else {
				message = { type: 'error', text: 'Invalid username or password' };
			}
		}, 1000);
	}
</script>

<svelte:head>
	<title>Sign In - SvelteHR</title>
	<meta name="description" content="Sign in to your SvelteHR account" />
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
				<Building2 class="h-8 w-8 text-primary-foreground" />
			</div>
			<h1
				class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-4xl font-bold text-transparent"
			>
				Welcome back
			</h1>
			<p class="mt-3 text-lg text-muted-foreground">Sign in to your SvelteHR account</p>
		</div>

		<!-- Login Card -->
		<Card class="rounded-2xl border border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader class="space-y-1 pb-6">
				<CardTitle
					class="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-center text-2xl text-transparent"
					>Sign In</CardTitle
				>
				<CardDescription class="text-center text-muted-foreground">
					Enter your credentials to access your HR portal
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-6">
				<!-- Demo Credentials Banner -->
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-2">
							<Shield class="h-4 w-4 text-amber-600" />
							<span class="text-sm text-amber-800">Demo Account Available</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={fillDemoCredentials}
							class="h-6 px-2 text-amber-700 hover:text-amber-900"
						>
							Use Demo
						</Button>
					</div>
				</div>

				<!-- Error Message -->
				{#if message && message.type === 'error'}
					<Alert variant="destructive">
						<AlertDescription>{message.text}</AlertDescription>
					</Alert>
				{/if}

				<!-- Login Form -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						onSubmit();
					}}
					class="space-y-4"
				>
					<!-- Username Field -->
					<div class="space-y-2">
						<InputGroup
							label="Username"
							type="text"
							placeholder="Enter your username"
							prefixIcon={User}
							bind:value={formData.username}
							error={errors.username}
							disabled={isSubmitting}
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
							bind:value={formData.password}
							error={errors.password}
							disabled={isSubmitting}
							autocomplete="current-password"
						>
							<button
								slot="suffix"
								type="button"
								onclick={togglePasswordVisibility}
								class="text-gray-400 hover:text-gray-600 focus:outline-none"
								tabindex="-1"
							>
								{#if showPassword}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</InputGroup>
					</div>

					<!-- Remember Me -->
					<div class="flex items-center space-x-2">
						<Checkbox id="rememberMe" bind:checked={formData.rememberMe} disabled={isSubmitting} />
						<label for="rememberMe" class="text-sm text-gray-700"> Remember me for 7 days </label>
					</div>

					<!-- Submit Button -->
					<Button type="submit" variant="default" size="lg" class="w-full" disabled={isSubmitting}>
						{#if isSubmitting}
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

				<!-- Help Links -->
				<div class="space-y-2 text-center">
					<a href="/forgot-password" class="text-sm text-primary-600 hover:text-primary-500">
						Forgot your password?
					</a>
					<div class="text-xs text-gray-500">Need help? Contact your HR administrator</div>
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
