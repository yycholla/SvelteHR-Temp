<!--
	Magic Link Authentication Page
	
	Allows users to enter their email and receive a magic link for secure authentication
-->

<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form = $bindable() }: Props = $props();

	let isLoading = $state(false);
	let email = $state('');
	let submitted = $state(false);

	// Check if magic link was successfully sent
	const magicLinkSent = $derived(form?.success === true);
</script>

<svelte:head>
	<title>Sign In with Magic Link - SvelteHR</title>
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
				{magicLinkSent ? 'Check Your Email' : 'Sign In with Magic Link'}
			</h1>
			<p class="mt-2 text-muted-foreground">
				{magicLinkSent 
					? `We've sent a secure sign-in link to ${form?.email}`
					: 'Enter your email to receive a secure sign-in link'
				}
			</p>
		</div>

		{#if magicLinkSent}
			<!-- Success State -->
			<div class="bg-card border rounded-lg shadow-sm p-8 text-center">
				<div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
					<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
					</svg>
				</div>
				
				<h2 class="text-xl font-semibold text-foreground mb-2">Magic Link Sent!</h2>
				
				<div class="space-y-4 text-sm text-muted-foreground">
					<p>
						We've sent a secure sign-in link to:
						<br>
						<strong class="text-foreground">{form?.email}</strong>
					</p>
					
					<div class="bg-muted/50 rounded-lg p-4">
						<h3 class="font-medium text-foreground mb-2">Next Steps:</h3>
						<ol class="text-left space-y-1">
							<li>1. Check your email inbox</li>
							<li>2. Click the "Sign In" link in the email</li>
							<li>3. You'll be automatically signed in</li>
						</ol>
					</div>
					
					<p class="text-xs">
						Didn't receive the email? Check your spam folder or try again with a different email address.
					</p>
				</div>

				<div class="mt-6 pt-6 border-t space-y-3">
					<Button 
						variant="outline" 
						onclick={() => { submitted = false; form = null; }}
						class="w-full"
					>
						Try Different Email
					</Button>
					
					<a 
						href="/login" 
						class="inline-block w-full text-center text-sm text-muted-foreground hover:text-foreground"
					>
						← Back to Login
					</a>
				</div>
			</div>
		{:else}
			<!-- Magic Link Form -->
			<div class="bg-card border rounded-lg shadow-sm p-8">
				<form 
					method="POST" 
					action="?/send"
					use:enhance={({ formElement, formData, cancel }) => {
						isLoading = true;
						submitted = true;
						
						return async ({ result, update }) => {
							isLoading = false;
							await update();
						};
					}}
				>
					<div class="space-y-6">
						<!-- Error Message -->
						{#if form?.error}
							<div 
								class="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
								role="alert"
								aria-live="polite"
							>
								{form.error}
							</div>
						{/if}

						<!-- Email Input -->
						<div class="space-y-2">
							<Input
								type="email"
								name="email"
								label="Email Address"
								placeholder="Enter your work email"
								required
								autocomplete="email"
								bind:value={email}
								error={form?.error && !form.success ? form.error : ''}
								disabled={isLoading}
							/>
						</div>

						<!-- Hidden redirect field -->
						{#if data.redirectTo}
							<input type="hidden" name="redirectTo" value={data.redirectTo} />
						{/if}

						<!-- Submit Button -->
						<Button
							type="submit"
							variant="primary"
							size="lg"
							class="w-full"
							loading={isLoading}
							disabled={isLoading || !email}
						>
							{isLoading ? 'Sending Magic Link...' : 'Send Magic Link'}
						</Button>

						<!-- Info -->
						<div class="text-center">
							<details class="text-sm text-muted-foreground">
								<summary class="cursor-pointer hover:text-foreground mb-2 inline-flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
									</svg>
									Why magic links?
								</summary>
								<div class="space-y-2 p-3 bg-muted/50 rounded-md text-left">
									<p><strong>More Secure:</strong> No passwords to remember or store</p>
									<p><strong>Always Fresh:</strong> Each link is unique and expires quickly</p>
									<p><strong>Easy to Use:</strong> Just click the link in your email</p>
									<p><strong>Faster:</strong> No typing passwords or dealing with 2FA</p>
								</div>
							</details>
						</div>
					</div>
				</form>
			</div>
		{/if}

		<!-- Footer Links -->
		<div class="text-center text-sm space-y-2">
			<a
				href="/login"
				class="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
			>
				← Back to Login Options
			</a>
			
			<div class="text-xs text-muted-foreground">
				<p>
					Need help? <a href="/support" class="text-primary hover:text-primary/80">Contact IT Support</a>
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom focus styles for better accessibility */
	a:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: 2px;
		border-radius: 0.125rem;
	}
</style>