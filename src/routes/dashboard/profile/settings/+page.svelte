<script lang="ts">
	/**
	 * Profile Settings Page
	 * Allows users to manage their profile settings, notification preferences, and theme
	 */

	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { themeStore } from '$lib/stores/theme';
	import type { Theme } from '$lib/stores/theme';
	import {
		User,
		Bell,
		Palette,
		Save,
		Loader2,
		Mail,
		Phone,
		MapPin,
		Briefcase,
		AlertCircle
	} from '@lucide/svelte';

	interface Props {
		data: {
			user: any;
			profile: any;
			notificationPreferences: any;
			themePreference: string;
		};
		form?: any;
	}

	let { data, form }: Props = $props();

	let activeTab = $state('general');
	let isSubmitting = $state(false);

	// Form states for profile edit
	let profileChanges = $state({
		firstName: data.profile.firstName || '',
		lastName: data.profile.lastName || '',
		displayName: data.profile.displayName || '',
		email: data.profile.email || '',
		phoneNumber: data.profile.phoneNumber || '',
		mobileNumber: data.profile.mobileNumber || '',
		addressLine1: data.profile.addressLine1 || '',
		addressLine2: data.profile.addressLine2 || '',
		city: data.profile.city || '',
		stateProvince: data.profile.stateProvince || '',
		postalCode: data.profile.postalCode || '',
		country: data.profile.country || 'United States',
		reason: ''
	});

	// Notification preferences state
	let notificationPrefs = $state({ ...data.notificationPreferences });
	let selectedTheme = $state(data.themePreference);

	// Initialize theme store with database value on mount
	onMount(() => {
		// Sync theme store with database value
		if (data.themePreference && data.themePreference !== $themeStore.current) {
			themeStore.setTheme(data.themePreference as Theme);
		}
	});

	// Check if there are any changes
	const hasChanges = $derived(
		profileChanges.firstName !== (data.profile.firstName || '') ||
			profileChanges.lastName !== (data.profile.lastName || '') ||
			profileChanges.displayName !== (data.profile.displayName || '') ||
			profileChanges.email !== (data.profile.email || '') ||
			profileChanges.phoneNumber !== (data.profile.phoneNumber || '') ||
			profileChanges.mobileNumber !== (data.profile.mobileNumber || '') ||
			profileChanges.addressLine1 !== (data.profile.addressLine1 || '') ||
			profileChanges.addressLine2 !== (data.profile.addressLine2 || '') ||
			profileChanges.city !== (data.profile.city || '') ||
			profileChanges.stateProvince !== (data.profile.stateProvince || '') ||
			profileChanges.postalCode !== (data.profile.postalCode || '') ||
			profileChanges.country !== (data.profile.country || 'United States')
	);

	// Handle theme update manually to avoid infinite loops
	async function handleThemeSubmit(event: Event) {
		event.preventDefault();

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const theme = formData.get('theme') as string;

		console.log('[Settings] Submitting theme:', theme);

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				body: formData,
				headers: {
					'Accept': 'application/json'
				}
			});

			// SvelteKit form actions return JSON with type and data properties
			const result = await response.json();
			console.log('[Settings] Server response:', result);

			if (result.type === 'success' || (response.ok && result.data?.success)) {
				console.log('[Settings] Theme update successful');
				toast.success(`Theme updated to ${theme}`);

				// Apply theme immediately via theme store
				themeStore.setTheme(theme as Theme);
				console.log(
					'[Settings] Theme applied. Current:',
					$themeStore.current,
					'Resolved:',
					$themeStore.resolved
				);
			} else {
				const errorMsg = result.data?.error || result.error || 'Failed to update theme';
				console.error('[Settings] Theme update failed:', result);
				toast.error(errorMsg);
			}
		} catch (error) {
			console.error('[Settings] Theme update error:', error);
			toast.error('Failed to update theme preference');
		}
	}
</script>

<svelte:head>
	<title>Profile Settings - SvelteHR</title>
	<meta name="description" content="Manage your profile settings, notifications, and preferences" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
		<p class="text-muted-foreground">Manage your profile settings and preferences</p>
	</div>

	<!-- Settings Tabs -->
	<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)}>
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="general">
				<User class="mr-2 h-4 w-4" />
				General
			</Tabs.Trigger>
			<Tabs.Trigger value="notifications">
				<Bell class="mr-2 h-4 w-4" />
				Notifications
			</Tabs.Trigger>
			<Tabs.Trigger value="appearance">
				<Palette class="mr-2 h-4 w-4" />
				Appearance
			</Tabs.Trigger>
		</Tabs.List>

		<!-- General Settings Tab -->
		<Tabs.Content value="general">
			<div class="space-y-6">
				<!-- Info Notice -->
				<Card.Root class="border-blue-200 bg-blue-50">
					<Card.Content class="flex items-start gap-3 pt-6">
						<AlertCircle class="h-5 w-5 text-blue-600" />
						<div class="flex-1">
							<p class="text-sm text-blue-900">
								To update your profile information, make the desired changes below and provide a reason.
								Your request will be reviewed by an administrator.
							</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Profile Information Edit Form -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Profile Information</Card.Title>
						<Card.Description>
							Update your personal information. Changes require administrator approval.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<form method="POST" action="?/requestInfoChange" use:enhance>
							<div class="space-y-6">
								<!-- Personal Information Section -->
								<div class="space-y-4">
									<h4 class="text-sm font-semibold flex items-center gap-2">
										<User class="h-4 w-4" />
										Personal Information
									</h4>

									<div class="grid gap-4 md:grid-cols-2">
										<!-- First Name -->
										<div class="grid gap-2">
											<Label for="firstName">First Name *</Label>
											<Input
												id="firstName"
												name="firstName"
												bind:value={profileChanges.firstName}
												required
											/>
											<input
												type="hidden"
												name="current_firstName"
												value={data.profile.firstName || ''}
											/>
										</div>

										<!-- Last Name -->
										<div class="grid gap-2">
											<Label for="lastName">Last Name *</Label>
											<Input id="lastName" name="lastName" bind:value={profileChanges.lastName} required />
											<input
												type="hidden"
												name="current_lastName"
												value={data.profile.lastName || ''}
											/>
										</div>
									</div>

									<!-- Display Name -->
									<div class="grid gap-2">
										<Label for="displayName">Display Name</Label>
										<Input
											id="displayName"
											name="displayName"
											bind:value={profileChanges.displayName}
											placeholder="How you'd like to be addressed"
										/>
										<input
											type="hidden"
											name="current_displayName"
											value={data.profile.displayName || ''}
										/>
									</div>
								</div>

								<!-- Contact Information Section -->
								<div class="space-y-4 border-t pt-4">
									<h4 class="text-sm font-semibold flex items-center gap-2">
										<Mail class="h-4 w-4" />
										Contact Information
									</h4>

									<div class="grid gap-4">
										<!-- Email -->
										<div class="grid gap-2">
											<Label for="email">Email Address *</Label>
											<Input
												id="email"
												name="email"
												type="email"
												bind:value={profileChanges.email}
												required
											/>
											<input type="hidden" name="current_email" value={data.profile.email || ''} />
										</div>

										<!-- Phone Numbers -->
										<div class="grid gap-4 md:grid-cols-2">
											<div class="grid gap-2">
												<Label for="phoneNumber">Phone Number</Label>
												<Input
													id="phoneNumber"
													name="phoneNumber"
													type="tel"
													bind:value={profileChanges.phoneNumber}
													placeholder="(555) 123-4567"
												/>
												<input
													type="hidden"
													name="current_phoneNumber"
													value={data.profile.phoneNumber || ''}
												/>
											</div>

											<div class="grid gap-2">
												<Label for="mobileNumber">Mobile Number</Label>
												<Input
													id="mobileNumber"
													name="mobileNumber"
													type="tel"
													bind:value={profileChanges.mobileNumber}
													placeholder="(555) 987-6543"
												/>
												<input
													type="hidden"
													name="current_mobileNumber"
													value={data.profile.mobileNumber || ''}
												/>
											</div>
										</div>
									</div>
								</div>

								<!-- Address Section -->
								<div class="space-y-4 border-t pt-4">
									<h4 class="text-sm font-semibold flex items-center gap-2">
										<MapPin class="h-4 w-4" />
										Address
									</h4>

									<div class="grid gap-4">
										<!-- Address Line 1 -->
										<div class="grid gap-2">
											<Label for="addressLine1">Address Line 1</Label>
											<Input
												id="addressLine1"
												name="addressLine1"
												bind:value={profileChanges.addressLine1}
												placeholder="123 Main Street"
											/>
											<input
												type="hidden"
												name="current_addressLine1"
												value={data.profile.addressLine1 || ''}
											/>
										</div>

										<!-- Address Line 2 -->
										<div class="grid gap-2">
											<Label for="addressLine2">Address Line 2</Label>
											<Input
												id="addressLine2"
												name="addressLine2"
												bind:value={profileChanges.addressLine2}
												placeholder="Apt, Suite, etc. (optional)"
											/>
											<input
												type="hidden"
												name="current_addressLine2"
												value={data.profile.addressLine2 || ''}
											/>
										</div>

										<!-- City, State, Postal Code -->
										<div class="grid gap-4 md:grid-cols-3">
											<div class="grid gap-2">
												<Label for="city">City</Label>
												<Input id="city" name="city" bind:value={profileChanges.city} />
												<input type="hidden" name="current_city" value={data.profile.city || ''} />
											</div>

											<div class="grid gap-2">
												<Label for="stateProvince">State/Province</Label>
												<Input
													id="stateProvince"
													name="stateProvince"
													bind:value={profileChanges.stateProvince}
												/>
												<input
													type="hidden"
													name="current_stateProvince"
													value={data.profile.stateProvince || ''}
												/>
											</div>

											<div class="grid gap-2">
												<Label for="postalCode">Postal Code</Label>
												<Input
													id="postalCode"
													name="postalCode"
													bind:value={profileChanges.postalCode}
												/>
												<input
													type="hidden"
													name="current_postalCode"
													value={data.profile.postalCode || ''}
												/>
											</div>
										</div>

										<!-- Country -->
										<div class="grid gap-2">
											<Label for="country">Country</Label>
											<Input id="country" name="country" bind:value={profileChanges.country} />
											<input type="hidden" name="current_country" value={data.profile.country || ''} />
										</div>
									</div>
								</div>

								<!-- HR-Managed Fields (Read-Only) -->
								<div class="space-y-4 border-t pt-4">
									<h4 class="text-sm font-semibold flex items-center gap-2">
										<Briefcase class="h-4 w-4" />
										Company Information (Managed by HR)
									</h4>

									<div class="grid gap-4 md:grid-cols-2">
										<div class="rounded-lg border bg-muted/50 p-3">
											<Label class="text-xs text-muted-foreground">Department</Label>
											<p class="text-sm font-medium">
												{data.profile.department?.name || 'Not assigned'}
											</p>
										</div>

										<div class="rounded-lg border bg-muted/50 p-3">
											<Label class="text-xs text-muted-foreground">Hire Date</Label>
											<p class="text-sm font-medium">
												{data.profile.hireDate
													? new Date(data.profile.hireDate).toLocaleDateString()
													: 'Not set'}
											</p>
										</div>

										<div class="rounded-lg border bg-muted/50 p-3">
											<Label class="text-xs text-muted-foreground">Role</Label>
											<p class="text-sm font-medium capitalize">
												{data.profile.role?.replace(/_/g, ' ') || 'Employee'}
											</p>
										</div>

										<div class="rounded-lg border bg-muted/50 p-3">
											<Label class="text-xs text-muted-foreground">Status</Label>
											<p class="text-sm font-medium">
												{data.profile.isActive ? 'Active' : 'Inactive'}
											</p>
										</div>
									</div>
								</div>

								<!-- Reason for Changes -->
								{#if hasChanges}
									<div class="space-y-4 border-t pt-4">
										<div class="grid gap-2">
											<Label for="reason" class="text-base font-semibold">
												Reason for Changes * (minimum 10 characters)
											</Label>
											<Textarea
												id="reason"
												name="reason"
												bind:value={profileChanges.reason}
												placeholder="Explain why you need to update your profile information"
												rows={4}
												required
											/>
											<p class="text-xs text-muted-foreground">
												{profileChanges.reason.length}/10 minimum characters
											</p>
										</div>
									</div>
								{/if}

								<!-- Submit Button -->
								<div class="flex justify-end gap-2 border-t pt-4">
									{#if hasChanges}
										<Button
											type="submit"
											disabled={!hasChanges || profileChanges.reason.length < 10}
										>
											<Save class="mr-2 h-4 w-4" />
											Submit Change Request
										</Button>
									{:else}
										<p class="text-sm text-muted-foreground italic">
											Make changes to your profile to request an update
										</p>
									{/if}
								</div>
							</div>
						</form>
					</Card.Content>
				</Card.Root>
			</div>
		</Tabs.Content>

		<!-- Notifications Settings Tab -->
		<Tabs.Content value="notifications">
			<Card.Root>
				<Card.Header>
					<Card.Title>Notification Preferences</Card.Title>
					<Card.Description>
						Manage how you receive notifications about updates and activities
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" action="?/updateNotifications" use:enhance>
						<div class="space-y-6">
							<!-- Email Notifications -->
							<div class="flex items-center justify-between">
								<div class="space-y-0.5">
									<Label>Email Notifications</Label>
									<p class="text-sm text-muted-foreground">Receive notifications via email</p>
								</div>
								<Switch name="emailNotifications" bind:checked={notificationPrefs.emailNotifications} />
							</div>

							<div class="border-t pt-6">
								<h4 class="mb-4 text-sm font-medium">Notification Types</h4>
								<div class="space-y-4">
									<div class="flex items-center justify-between">
										<div class="space-y-0.5">
											<Label>Leave Request Updates</Label>
											<p class="text-sm text-muted-foreground">
												Status changes on your leave requests
											</p>
										</div>
										<Switch
											name="leaveRequestUpdates"
											bind:checked={notificationPrefs.leaveRequestUpdates}
										/>
									</div>

									<div class="flex items-center justify-between">
										<div class="space-y-0.5">
											<Label>Task Assignments</Label>
											<p class="text-sm text-muted-foreground">When you're assigned to a new task</p>
										</div>
										<Switch name="taskAssignments" bind:checked={notificationPrefs.taskAssignments} />
									</div>

									<div class="flex items-center justify-between">
										<div class="space-y-0.5">
											<Label>Performance Reviews</Label>
											<p class="text-sm text-muted-foreground">
												Reminders and updates about performance reviews
											</p>
										</div>
										<Switch
											name="performanceReviews"
											bind:checked={notificationPrefs.performanceReviews}
										/>
									</div>

									<div class="flex items-center justify-between">
										<div class="space-y-0.5">
											<Label>System Announcements</Label>
											<p class="text-sm text-muted-foreground">
												Important system-wide announcements
											</p>
										</div>
										<Switch
											name="systemAnnouncements"
											bind:checked={notificationPrefs.systemAnnouncements}
										/>
									</div>

									<div class="flex items-center justify-between">
										<div class="space-y-0.5">
											<Label>Team Updates</Label>
											<p class="text-sm text-muted-foreground">
												Updates from your team and department
											</p>
										</div>
										<Switch name="teamUpdates" bind:checked={notificationPrefs.teamUpdates} />
									</div>

									<div class="flex items-center justify-between">
										<div class="space-y-0.5">
											<Label>Weekly Digest</Label>
											<p class="text-sm text-muted-foreground">
												Summary of weekly activities and updates
											</p>
										</div>
										<Switch name="weeklyDigest" bind:checked={notificationPrefs.weeklyDigest} />
									</div>
								</div>
							</div>

							<div class="flex justify-end">
								<Button type="submit">
									<Save class="mr-2 h-4 w-4" />
									Save Preferences
								</Button>
							</div>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Appearance Settings Tab -->
		<Tabs.Content value="appearance">
			<Card.Root>
				<Card.Header>
					<Card.Title>Appearance</Card.Title>
					<Card.Description>Customize the look and feel of the application</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" action="?/updateTheme" onsubmit={handleThemeSubmit}>
						<div class="space-y-6">
							<div class="space-y-4">
								<Label for="theme">Theme</Label>
								<select
									id="theme"
									name="theme"
									bind:value={selectedTheme}
									class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
								>
									<option value="light">Light</option>
									<option value="dark">Dark</option>
									<option value="system">System</option>
								</select>
								<p class="text-sm text-muted-foreground">
									Choose your preferred color theme. System will match your operating system's theme.
								</p>
							</div>

							<div class="flex justify-end">
								<Button type="submit">
									<Save class="mr-2 h-4 w-4" />
									Save Theme
								</Button>
							</div>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
