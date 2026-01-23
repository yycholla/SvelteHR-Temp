<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import AuthLayout from '$lib/components/auth/AuthLayout.svelte';
	import { onMount } from 'svelte';

	let token = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let success = $state(false);
	let showPassword = $state(false);
	let invalidToken = $state(false);

	// Password validation
	let passwordErrors = $derived.by(() => {
		const errors: string[] = [];
		if (newPassword && newPassword.length < 8) {
			errors.push('At least 8 characters');
		}
		if (newPassword && !/[A-Z]/.test(newPassword)) {
			errors.push('One uppercase letter');
		}
		if (newPassword && !/[a-z]/.test(newPassword)) {
			errors.push('One lowercase letter');
		}
		if (newPassword && !/[0-9]/.test(newPassword)) {
			errors.push('One number');
		}
		return errors;
	});

	let passwordsMatch = $derived(newPassword && confirmPassword && newPassword === confirmPassword);
	let isValid = $derived(passwordErrors.length === 0 && passwordsMatch);

	onMount(() => {
		// Get token from URL query parameter
		const urlToken = $page.url.searchParams.get('token');
		if (!urlToken) {
			invalidToken = true;
			toast.error('Invalid reset link', {
				description: 'The password reset link is missing or invalid'
			});
		} else {
			token = urlToken;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!isValid) {
			toast.error('Please fix password errors');
			return;
		}

		if (!token) {
			toast.error('Invalid reset token');
			return;
		}

		loading = true;

		try {
			// Call REST API endpoint (public - no auth required)
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					token,
					new_password: newPassword
				})
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				toast.error('Password reset failed', {
					description: data.message || 'The reset link may be expired or invalid'
				});
				invalidToken = true;
				return;
			}

			// Success!
			success = true;
			toast.success('Password reset successful!', {
				description: 'You can now log in with your new password'
			});

			// Redirect to login after 2 seconds
			setTimeout(() => {
				goto('/login');
			}, 2000);
		} catch (error) {
			console.error('Password reset error:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			loading = false;
		}
	}
</script>

<AuthLayout title="Reset Password">
	<div class="w-full max-w-md">
		{#if invalidToken}
			<div class="text-center">
				<div class="mb-4">
					<svg
						class="mx-auto h-12 w-12 text-red-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>

				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Invalid or Expired Link
				</h2>

				<p class="text-gray-600 dark:text-gray-400 mb-6">
					This password reset link is invalid or has expired. Please request a new one.
				</p>

				<div class="space-y-3">
					<button
						onclick={() => goto('/auth/forgot-password')}
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg
							transition-colors duration-200"
					>
						Request New Link
					</button>

					<button
						onclick={() => goto('/login')}
						class="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
							text-gray-700 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg
							transition-colors duration-200"
					>
						Back to Login
					</button>
				</div>
			</div>
		{:else if success}
			<div class="text-center">
				<div class="mb-4">
					<svg
						class="mx-auto h-12 w-12 text-green-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>

				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Password Reset Successful!
				</h2>

				<p class="text-gray-600 dark:text-gray-400 mb-6">
					Your password has been updated. Redirecting to login...
				</p>
			</div>
		{:else}
			<div class="mb-6 text-center">
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New Password</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Please enter your new password below.
				</p>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- New Password -->
				<div>
					<label
						for="newPassword"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						New Password
					</label>
					<div class="relative">
						<input
							id="newPassword"
							type={showPassword ? 'text' : 'password'}
							bind:value={newPassword}
							required
							disabled={loading}
							placeholder="Enter new password"
							class="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
								focus:ring-2 focus:ring-indigo-500 focus:border-transparent
								dark:bg-gray-700 dark:text-white
								disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
						>
							{#if showPassword}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							{/if}
						</button>
					</div>
					{#if passwordErrors.length > 0}
						<ul class="mt-2 text-sm text-red-600 dark:text-red-400 space-y-1">
							{#each passwordErrors as error}
								<li>• {error}</li>
							{/each}
						</ul>
					{/if}
				</div>

				<!-- Confirm Password -->
				<div>
					<label
						for="confirmPassword"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						type={showPassword ? 'text' : 'password'}
						bind:value={confirmPassword}
						required
						disabled={loading}
						placeholder="Confirm new password"
						class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
							focus:ring-2 focus:ring-indigo-500 focus:border-transparent
							dark:bg-gray-700 dark:text-white
							disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					{#if confirmPassword && !passwordsMatch}
						<p class="mt-2 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={loading || !isValid}
					class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg
						transition-colors duration-200
						disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Resetting Password...' : 'Reset Password'}
				</button>

				<div class="text-center">
					<a
						href="/login"
						class="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
					>
						← Back to Login
					</a>
				</div>
			</form>
		{/if}
	</div>
</AuthLayout>
