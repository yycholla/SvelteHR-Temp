<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import { jwtAuth } from '$lib/stores/jwt-auth.svelte';
	import { resolve } from '$app/paths';
	import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	/**
	 * Login Form Component
	 * Handles user authentication with email/password
	 */

	const dispatch = createEventDispatcher<{
		success: { user: any };
		error: { message: string };
	}>();

	// Form state using Svelte 5 runes
	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let formErrors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let hasSucceeded = $state(false); // Flag to prevent multiple submissions after success
	let mounted = $state(false); // Fix hydration mismatch

	onMount(() => {
		mounted = true;
	});

	// Validation rules
	const validateEmail = (email: string): string => {
		if (!email) return 'Email is required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
		return '';
	};

	const validatePassword = (password: string): string => {
		if (!password) return 'Password is required';
		if (password.length < 8) return 'Password must be at least 8 characters';
		return '';
	};

	// Form validation
	const validateForm = (): boolean => {
		formErrors = {};

		const emailError = validateEmail(email);
		const passwordError = validatePassword(password);

		if (emailError) formErrors.email = emailError;
		if (passwordError) formErrors.password = passwordError;

		return Object.keys(formErrors).length === 0;
	};

	// SECURITY: Verify credentials are never in URL before submission
	const ensureNoCredentialsInURL = (): boolean => {
		if (typeof window === 'undefined') return true;

		const url = new URL(window.location.href);
		const suspiciousParams = ['password', 'pass', 'email', 'username', 'pwd', 'token', 'secret'];

		for (const param of suspiciousParams) {
			if (url.searchParams.has(param)) {
				logger.error('[SECURITY] Credentials detected in URL, clearing...');
				// Clear the URL without reloading
				window.history.replaceState({}, '', url.pathname);
				return false;
			}
		}

		return true;
	};

	// Handle form submission
	const handleSubmit = async (event: Event) => {
		event.preventDefault();
		event.stopPropagation(); // Prevent any parent handlers

		// SECURITY: Ensure no credentials in URL
		if (!ensureNoCredentialsInURL()) {
			jwtAuth.error = 'Security check failed. Please try again.';
			return;
		}

		// Prevent multiple submissions
		if (isSubmitting || hasSucceeded || !validateForm()) return;

		isSubmitting = true;
		jwtAuth.error = null;

		try {
			const result = await jwtAuth.login(email, password);

			if (result.success) {
				hasSucceeded = true; // Prevent further submissions
				dispatch('success', { user: { email } });
				// Let the parent component handle navigation
			} else {
				// Error will be set in the jwt auth store
				const errorMessage = result.error || 'Login failed';
				dispatch('error', { message: errorMessage });
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An unexpected error occurred';
			jwtAuth.error = message;
			dispatch('error', { message });
		} finally {
			isSubmitting = false;
		}
	};

	// Handle input changes with validation
	const handleEmailChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		email = target.value;
		if (formErrors.email) {
			const error = validateEmail(email);
			if (!error) delete formErrors.email;
			else formErrors.email = error;
		}
	};

	const handlePasswordChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		password = target.value;
		if (formErrors.password) {
			const error = validatePassword(password);
			if (!error) delete formErrors.password;
			else formErrors.password = error;
		}
	};

	// Toggle password visibility
	const togglePasswordVisibility = () => {
		showPassword = !showPassword;
	};
</script>

<div class="mx-auto w-full max-w-md">
	<form onsubmit={handleSubmit} class="space-y-6" novalidate data-testid="login-form">
		<!-- Header -->
		<div class="text-center">
			<h1 class="text-2xl font-semibold text-foreground">Sign in to MountainHR</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Welcome back! Please sign in to your account.
			</p>
		</div>

		<!-- Global Error Message -->
		{#if mounted && jwtAuth.error}
			<Alert variant="destructive" data-testid="login-error-message">
				<AlertCircle class="h-4 w-4" />
				<AlertTitle>Authentication Error</AlertTitle>
				<AlertDescription>{jwtAuth.error}</AlertDescription>
			</Alert>
		{/if}

		<!-- Email Field -->
		<div class="space-y-2">
			<Label for="email">Email address</Label>
			<div class="relative">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Mail class="h-4 w-4 text-muted-foreground" />
				</div>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					class="pl-10 {formErrors.email ? 'border-destructive' : ''}"
					placeholder="Enter your email"
					bind:value={email}
					oninput={handleEmailChange}
					onblur={() => {
						const error = validateEmail(email);
						if (error) formErrors.email = error;
					}}
					disabled={isSubmitting || (mounted && jwtAuth.isLoading)}
					data-testid="login-username-input"
				/>
			</div>
			{#if formErrors.email}
				<p class="text-sm text-destructive">{formErrors.email}</p>
			{/if}
		</div>

		<!-- Password Field -->
		<div class="space-y-2">
			<Label for="password">Password</Label>
			<div class="relative">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Lock class="h-4 w-4 text-muted-foreground" />
				</div>
				<Input
					id="password"
					name="password"
					type={showPassword ? 'text' : 'password'}
					autocomplete="current-password"
					required
					class="pr-10 pl-10 {formErrors.password ? 'border-destructive' : ''}"
					placeholder="Enter your password"
					bind:value={password}
					oninput={handlePasswordChange}
					onblur={() => {
						const error = validatePassword(password);
						if (error) formErrors.password = error;
					}}
					disabled={isSubmitting || (mounted && jwtAuth.isLoading)}
					data-testid="login-password-input"
				/>
				<div class="absolute inset-y-0 right-0 flex items-center pr-3">
					<button
						type="button"
						class="text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
						onclick={togglePasswordVisibility}
						disabled={isSubmitting || (mounted && jwtAuth.isLoading)}
					>
						{#if showPassword}
							<EyeOff class="h-4 w-4" />
						{:else}
							<Eye class="h-4 w-4" />
						{/if}
					</button>
				</div>
			</div>
			{#if formErrors.password}
				<p class="text-sm text-destructive">{formErrors.password}</p>
			{/if}
		</div>

		<!-- Forgot Password -->
		<div class="flex items-center justify-end">
			<div class="text-sm">
				<a
					href={resolve('/auth/forgot-password' as any)}
					class="font-medium text-primary transition-colors hover:text-primary/80 focus:underline focus:outline-none"
				>
					Forgot your password?
				</a>
			</div>
		</div>

		<!-- Submit Button -->
		<div>
			<Button
				type="submit"
				disabled={isSubmitting ||
					(mounted && jwtAuth.isLoading) ||
					hasSucceeded ||
					Object.keys(formErrors).length > 0}
				class="w-full"
				data-testid="login-submit-button"
			>
				{#if isSubmitting || (mounted && jwtAuth.isLoading)}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Signing in...
				{:else}
					Sign in
				{/if}
			</Button>
		</div>

		<!-- Sign Up Link -->
		<div class="text-center">
			<p class="text-sm text-muted-foreground">
				Don't have an account?
				<a
					href={resolve('/auth/register' as any)}
					class="font-medium text-primary transition-colors hover:text-primary/80 focus:underline focus:outline-none"
				>
					Contact HR to get started
				</a>
			</p>
		</div>
	</form>
</div>
