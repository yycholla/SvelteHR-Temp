<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Form from '$lib/components/ui/Form.svelte';

	let { data, form } = $props();
	
	let isLoading = $state(false);
	let email = $state(form?.email || data.email || '');
	
	const hasMessage = $derived(!!data.message);
	const hasError = $derived(!!(data.error || form?.error));
	const errorMessage = $derived(data.error || form?.error);
	const successMessage = $derived(data.message);
</script>

<svelte:head>
	<title>Magic Link Sign In - SvelteHR</title>
	<meta name="description" content="Sign in to SvelteHR using a secure magic link sent to your email" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<!-- Header -->
		<div class="text-center">
			<div class="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6">
				<span class="text-primary-foreground font-bold text-2xl">HR</span>
			</div>
			<h1 class="text-3xl font-bold text-foreground">
				Magic Link Sign In
			</h1>
			<p class="mt-2 text-muted-foreground">
				Enter your email to receive a secure sign-in link
			</p>
		</div>

		<!-- Success Message -->
		{#if hasMessage && successMessage}
			<div class="p-4 text-sm bg-green-50 border border-green-200 rounded-md text-green-800">
				<div class="flex items-center gap-2">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
					</svg>
					<span>{successMessage}</span>
				</div>
				<p class="mt-2 text-xs text-green-600">
					Click the link in your email to complete sign in. The link will expire in 15 minutes.
				</p>
				{#if data.devLink}
					<div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
						<p class="font-semibold text-blue-800 mb-2">Development Mode - Magic Link:</p>
						<a 
							href={data.devLink} 
							class="text-blue-600 hover:text-blue-800 underline break-all"
						>
							{data.devLink}
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Error Message -->
		{#if hasError && errorMessage}
			<div class="p-4 text-sm bg-red-50 border border-red-200 rounded-md text-red-800">
				<div class="flex items-center gap-2">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
					</svg>
					<span>{errorMessage}</span>
				</div>
			</div>
		{/if}

		<!-- Magic Link Form -->
		<div class="bg-card border rounded-lg shadow-sm p-8">
			<Form
				action="?/sendMagicLink"
				method="POST"
				enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						await update();
						isLoading = false;
					};
				}}
				class="space-y-6"
			>
				<div class="space-y-4">
					<!-- Email Input -->
					<div>
						<label for="email" class="block text-sm font-medium text-foreground mb-2">
							Email Address
						</label>
						<Input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							placeholder="Enter your work email"
							bind:value={email}
							disabled={isLoading}
							class="w-full"
						/>
					</div>

					<!-- Submit Button -->
					<Button
						type="submit"
						variant="primary"
						size="lg"
						class="w-full"
						loading={isLoading}
						disabled={isLoading || !email}
					>
						{#if isLoading}
							Sending Magic Link...
						{:else}
							Send Magic Link
						{/if}
					</Button>
				</div>
			</Form>

			<!-- Information -->
			<div class="mt-6 text-center text-sm text-muted-foreground">
				<details>
					<summary class="cursor-pointer hover:text-foreground mb-2 inline-flex items-center gap-1">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						How Magic Links Work
					</summary>
					<div class="space-y-2 p-3 bg-muted/50 rounded-md text-left">
						<div class="flex items-start gap-2">
							<span class="text-primary font-semibold">1.</span>
							<span>Enter your work email address</span>
						</div>
						<div class="flex items-start gap-2">
							<span class="text-primary font-semibold">2.</span>
							<span>We'll send you a secure sign-in link</span>
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
		</div>

		<!-- Back to Login -->
		<div class="text-center text-sm">
			<a
				href="/login"
				class="text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
			>
				← Back to Main Login
			</a>
		</div>

		<!-- Footer -->
		<div class="text-center text-xs text-muted-foreground">
			<p>
				Need help? <a href="/support" class="text-primary hover:text-primary/80">Contact IT Support</a>
			</p>
		</div>

		{#if data.redirectTo}
			<div class="text-center text-xs text-muted-foreground">
				<p>You'll be redirected to: <code class="bg-muted px-1 rounded">{data.redirectTo}</code></p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom focus styles */
	a:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 0.125rem;
	}
</style>