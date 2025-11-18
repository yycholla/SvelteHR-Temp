<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	// Password visibility
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	// Validation errors
	let errors = $state<Record<string, string>>({});

	// Client-side validation
	function validateForm(): boolean {
		errors = {};

		if (!currentPassword.trim()) {
			errors.currentPassword = 'Current password is required';
		}

		if (!newPassword.trim()) {
			errors.newPassword = 'New password is required';
		} else if (newPassword.length < 8) {
			errors.newPassword = 'Password must be at least 8 characters';
		}

		if (!confirmPassword.trim()) {
			errors.confirmPassword = 'Please confirm your new password';
		} else if (newPassword !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}

		if (currentPassword === newPassword) {
			errors.newPassword = 'New password must be different from current password';
		}

		return Object.keys(errors).length === 0;
	}

	// Password strength indicator
	let passwordStrength = $derived(() => {
		if (newPassword.length === 0) return { level: 0, text: '', color: '' };
		if (newPassword.length < 8)
			return { level: 1, text: 'Too short', color: 'bg-destructive' };

		let strength = 0;
		if (newPassword.length >= 12) strength++;
		if (/[a-z]/.test(newPassword)) strength++;
		if (/[A-Z]/.test(newPassword)) strength++;
		if (/[0-9]/.test(newPassword)) strength++;
		if (/[^a-zA-Z0-9]/.test(newPassword)) strength++;

		if (strength <= 2) return { level: 2, text: 'Weak', color: 'bg-warning' };
		if (strength <= 3) return { level: 3, text: 'Medium', color: 'bg-yellow-500' };
		return { level: 4, text: 'Strong', color: 'bg-success' };
	});
</script>

<svelte:head>
	<title>Change Password - MountainHR</title>
	<meta name="description" content="Change your password" />
</svelte:head>

<div class="container mx-auto max-w-md px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold text-foreground">Change Password</h1>
		{#if data.forcePasswordChange}
			<div class="mt-4 rounded-lg border border-warning bg-warning/10 p-4">
				<p class="text-sm font-medium text-warning-foreground">
					You are required to change your password before continuing. Please choose a
					secure password.
				</p>
			</div>
		{:else}
			<p class="mt-2 text-muted-foreground">Update your account password</p>
		{/if}
	</div>

	<!-- Error Message -->
	{#if form?.error}
		<div class="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
			<p class="font-medium text-destructive">Error</p>
			<p class="text-sm text-destructive">{form.error}</p>
		</div>
	{/if}

	<!-- Password Change Form -->
	<form
		method="POST"
		use:enhance={() => {
			if (!validateForm()) {
				return async () => {
					// Cancel submission
				};
			}

			isSubmitting = true;
			return async ({ update }) => {
				isSubmitting = false;
				await update();
			};
		}}
		class="rounded-lg border border-border bg-card p-6 shadow-sm"
	>
		<div class="space-y-6">
			<!-- Current Password -->
			<div>
				<label
					for="currentPassword"
					class="mb-2 block text-sm font-medium text-foreground"
				>
					Current Password <span class="text-destructive">*</span>
				</label>
				<div class="relative">
					<input
						type={showCurrentPassword ? 'text' : 'password'}
						id="currentPassword"
						name="currentPassword"
						bind:value={currentPassword}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Enter current password"
					/>
					<button
						type="button"
						onclick={() => (showCurrentPassword = !showCurrentPassword)}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{#if showCurrentPassword}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
								/>
							</svg>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						{/if}
					</button>
				</div>
				{#if errors.currentPassword}
					<p class="mt-1 text-sm text-destructive">{errors.currentPassword}</p>
				{/if}
			</div>

			<!-- New Password -->
			<div>
				<label for="newPassword" class="mb-2 block text-sm font-medium text-foreground">
					New Password <span class="text-destructive">*</span>
				</label>
				<div class="relative">
					<input
						type={showNewPassword ? 'text' : 'password'}
						id="newPassword"
						name="newPassword"
						bind:value={newPassword}
						required
						minlength="8"
						class="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Enter new password (min 8 characters)"
					/>
					<button
						type="button"
						onclick={() => (showNewPassword = !showNewPassword)}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{#if showNewPassword}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
								/>
							</svg>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						{/if}
					</button>
				</div>

				<!-- Password Strength Indicator -->
				{#if newPassword.length > 0}
					{@const strength = passwordStrength()}
					<div class="mt-2">
						<div class="flex gap-1">
							{#each Array(4) as _, i}
								<div
									class="h-1 flex-1 rounded-full {i < strength.level
										? strength.color
										: 'bg-muted'}"
								></div>
							{/each}
						</div>
						<p class="mt-1 text-xs text-muted-foreground">
							Strength: <span class="font-medium">{strength.text}</span>
						</p>
					</div>
				{/if}

				{#if errors.newPassword}
					<p class="mt-1 text-sm text-destructive">{errors.newPassword}</p>
				{/if}
			</div>

			<!-- Confirm New Password -->
			<div>
				<label
					for="confirmPassword"
					class="mb-2 block text-sm font-medium text-foreground"
				>
					Confirm New Password <span class="text-destructive">*</span>
				</label>
				<div class="relative">
					<input
						type={showConfirmPassword ? 'text' : 'password'}
						id="confirmPassword"
						name="confirmPassword"
						bind:value={confirmPassword}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Confirm new password"
					/>
					<button
						type="button"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{#if showConfirmPassword}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
								/>
							</svg>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						{/if}
					</button>
				</div>
				{#if errors.confirmPassword}
					<p class="mt-1 text-sm text-destructive">{errors.confirmPassword}</p>
				{/if}
			</div>

			<!-- Submit Button -->
			<div class="flex gap-3 pt-4">
				<button
					type="submit"
					disabled={isSubmitting}
					class="flex-1 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{isSubmitting ? 'Changing Password...' : 'Change Password'}
				</button>
				{#if !data.forcePasswordChange}
					<a
						href="/dashboard"
						class="rounded-md border border-border bg-background px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
					>
						Cancel
					</a>
				{/if}
			</div>
		</div>
	</form>

	<!-- Password Requirements -->
	<div class="mt-6 rounded-md bg-muted p-4">
		<p class="mb-2 text-sm font-medium text-foreground">Password Requirements:</p>
		<ul class="list-inside list-disc space-y-1 text-xs text-muted-foreground">
			<li>At least 8 characters long</li>
			<li>Different from your current password</li>
			<li>Recommended: Mix of uppercase, lowercase, numbers, and symbols</li>
		</ul>
	</div>
</div>
