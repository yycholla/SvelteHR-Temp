<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { AlertCircle, Eye, EyeOff, Lock, Save, User } from '@lucide/svelte';
	import { timezoneOptions } from '$lib/graphql/settings-operations';

	interface Props {
		profileForm: any;
		passwordForm: any;
		canUpdateProfile: boolean;
		canChangePassword: boolean;
		isUpdating: boolean;
		passwordStrength: { score: number; feedback: string[]; isValid: boolean };
		onUpdateProfile: () => void;
		onChangePassword: () => void;
	}

	let {
		profileForm = $bindable(),
		passwordForm = $bindable(),
		canUpdateProfile,
		canChangePassword,
		isUpdating,
		passwordStrength,
		onUpdateProfile,
		onChangePassword
	}: Props = $props();

	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	function getPasswordStrengthColor(score: number): string {
		if (score <= 1) return 'bg-red-500';
		if (score <= 2) return 'bg-orange-500';
		if (score <= 3) return 'bg-yellow-500';
		if (score <= 4) return 'bg-blue-500';
		return 'bg-green-500';
	}

	function getPasswordStrengthText(score: number): string {
		if (score <= 1) return 'Weak';
		if (score <= 2) return 'Fair';
		if (score <= 3) return 'Good';
		if (score <= 4) return 'Strong';
		return 'Very Strong';
	}
</script>

<div class="space-y-6" data-testid="general-content">
	<!-- Profile Information Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<User class="h-5 w-5" />
				Profile Information
			</Card.Title>
			<Card.Description>Update your personal information and contact details</Card.Description>
		</Card.Header>
		<Card.Content>
			<form class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="firstName">First Name</Label>
						<Input
							id="firstName"
							bind:value={profileForm.firstName}
							disabled={!canUpdateProfile}
							data-testid="first-name-input"
						/>
					</div>
					<div class="space-y-2">
						<Label for="lastName">Last Name</Label>
						<Input
							id="lastName"
							bind:value={profileForm.lastName}
							disabled={!canUpdateProfile}
							data-testid="last-name-input"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="displayName">Display Name</Label>
					<Input
						id="displayName"
						bind:value={profileForm.displayName}
						disabled={!canUpdateProfile}
						data-testid="display-name-input"
					/>
					<p class="text-xs text-gray-500">How your name appears to other users</p>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							bind:value={profileForm.email}
							disabled={true}
							class="bg-gray-50"
							data-testid="email-input"
						/>
						<p class="text-xs text-gray-500">Contact IT support to change your email</p>
					</div>
					<div class="space-y-2">
						<Label for="phoneNumber">Phone Number</Label>
						<Input
							id="phoneNumber"
							type="tel"
							bind:value={profileForm.phoneNumber}
							disabled={!canUpdateProfile}
							data-testid="phone-number-input"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="jobTitle">Job Title</Label>
					<Input
						id="jobTitle"
						bind:value={profileForm.jobTitle}
						disabled={true}
						class="bg-gray-50"
						data-testid="job-title-input"
					/>
				</div>

				<div class="space-y-2">
					<Label for="bio">Bio</Label>
					<textarea
						id="bio"
						bind:value={profileForm.bio}
						disabled={!canUpdateProfile}
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
						placeholder="Tell us about yourself..."
						data-testid="bio-input"
					></textarea>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="timezone">Timezone</Label>
						<select
							id="timezone"
							bind:value={profileForm.timezone}
							disabled={!canUpdateProfile}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
							data-testid="timezone-select"
						>
							{#each timezoneOptions as tz}
								<option value={tz.value}>{tz.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<Label for="locale">Locale</Label>
						<select
							id="locale"
							bind:value={profileForm.locale}
							disabled={!canUpdateProfile}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
							data-testid="locale-select"
						>
							<option value="en-US">English (US)</option>
							<option value="en-GB">English (UK)</option>
							<option value="es-ES">Español</option>
							<option value="fr-FR">Français</option>
							<option value="de-DE">Deutsch</option>
						</select>
					</div>
				</div>
			</form>
		</Card.Content>
		{#if canUpdateProfile}
			<Card.Footer>
				<Button onclick={onUpdateProfile} disabled={isUpdating} data-testid="update-profile-button">
					{#if isUpdating}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
					{:else}
						<Save class="mr-2 h-4 w-4" />
					{/if}
					{isUpdating ? 'Updating...' : 'Save Changes'}
				</Button>
			</Card.Footer>
		{/if}
	</Card.Root>

	<!-- Security Card -->
	{#if canChangePassword}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Lock class="h-5 w-5" />
					Account Security
				</Card.Title>
				<Card.Description>Manage your password and security settings</Card.Description>
			</Card.Header>
			<Card.Content>
				<form class="space-y-4">
					<div class="space-y-2">
						<Label for="currentPassword">Current Password</Label>
						<div class="relative">
							<Input
								id="currentPassword"
								type={showCurrentPassword ? 'text' : 'password'}
								bind:value={passwordForm.currentPassword}
								data-testid="current-password-input"
							/>
							<button
								type="button"
								onclick={() => (showCurrentPassword = !showCurrentPassword)}
								class="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
							>
								{#if showCurrentPassword}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="newPassword">New Password</Label>
						<div class="relative">
							<Input
								id="newPassword"
								type={showNewPassword ? 'text' : 'password'}
								bind:value={passwordForm.newPassword}
								data-testid="new-password-input"
							/>
							<button
								type="button"
								onclick={() => (showNewPassword = !showNewPassword)}
								class="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
							>
								{#if showNewPassword}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</div>
						{#if passwordForm.newPassword}
							<div class="mt-2">
								<div class="mb-1 flex items-center justify-between text-sm">
									<span>Password strength: {getPasswordStrengthText(passwordStrength.score)}</span>
									<span>{passwordStrength.score}/5</span>
								</div>
								<div class="h-2 w-full rounded-full bg-gray-200">
									<div
										class="h-2 rounded-full transition-all {getPasswordStrengthColor(
											passwordStrength.score
										)}"
										style="width: {(passwordStrength.score / 5) * 100}%"
									></div>
								</div>
								{#if passwordStrength.feedback.length > 0}
									<ul class="mt-2 text-sm text-gray-600">
										{#each passwordStrength.feedback as feedback}
											<li class="flex items-center gap-1">
												<AlertCircle class="h-3 w-3 text-orange-500" />
												{feedback}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword">Confirm New Password</Label>
						<div class="relative">
							<Input
								id="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								bind:value={passwordForm.confirmPassword}
								data-testid="confirm-password-input"
							/>
							<button
								type="button"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
								class="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
							>
								{#if showConfirmPassword}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</button>
						</div>
						{#if passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword}
							<p class="flex items-center gap-1 text-sm text-red-600">
								<AlertCircle class="h-3 w-3" />
								Passwords do not match
							</p>
						{/if}
					</div>
				</form>
			</Card.Content>
			<Card.Footer>
				<Button
					variant="outline"
					onclick={onChangePassword}
					disabled={isUpdating ||
						!passwordForm.currentPassword ||
						!passwordForm.newPassword ||
						!passwordStrength.isValid}
					data-testid="change-password-button"
				>
					{#if isUpdating}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"
						></div>
					{:else}
						<Lock class="mr-2 h-4 w-4" />
					{/if}
					{isUpdating ? 'Updating...' : 'Update Password'}
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>

<style>
	/* Ensure proper Tailwind classes are generated */
	.bg-red-500 {
		background-color: rgb(239 68 68);
	}
	.bg-orange-500 {
		background-color: rgb(249 115 22);
	}
	.bg-yellow-500 {
		background-color: rgb(234 179 8);
	}
	.bg-blue-500 {
		background-color: rgb(59 130 246);
	}
	.bg-green-500 {
		background-color: rgb(34 197 94);
	}
</style>
