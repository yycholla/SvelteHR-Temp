<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import AuthLayout from '$lib/components/auth/AuthLayout.svelte';

	let email = $state('');
	let loading = $state(false);
	let submitted = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!email || !email.includes('@')) {
			toast.error('Please enter a valid email address');
			return;
		}

		loading = true;

		try {
			// Call REST API endpoint (public - no auth required)
			const response = await fetch('/api/auth/request-reset', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				toast.error('Failed to send reset email', {
					description: data.message || 'Please try again later'
				});
				return;
			}

			// Always show success message (security: don't reveal if email exists)
			submitted = true;
		} catch (error) {
			console.error('Password reset request error:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			loading = false;
		}
	}
</script>

<AuthLayout title="Forgot Password">
	<div class="w-full max-w-md">
		{#if !submitted}
			<div class="mb-6 text-center">
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password?</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Enter your email address and we'll send you a link to reset your password.
				</p>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label
						for="email"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						Email Address
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						disabled={loading}
						placeholder="you@example.com"
						class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
							focus:ring-2 focus:ring-indigo-500 focus:border-transparent
							dark:bg-gray-700 dark:text-white
							disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg
						transition-colors duration-200
						disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Sending...' : 'Send Reset Link'}
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
		{:else}
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
							d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
						/>
					</svg>
				</div>

				<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h2>

				<p class="text-gray-600 dark:text-gray-400 mb-6">
					If an account exists with <strong>{email}</strong>, you will receive a password reset link
					shortly.
				</p>

				<p class="text-sm text-gray-500 dark:text-gray-500 mb-6">
					The link will expire in 30 minutes for security reasons.
				</p>

				<button
					onclick={() => goto('/login')}
					class="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
						text-gray-700 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg
						transition-colors duration-200"
				>
					Return to Login
				</button>
			</div>
		{/if}
	</div>
</AuthLayout>
