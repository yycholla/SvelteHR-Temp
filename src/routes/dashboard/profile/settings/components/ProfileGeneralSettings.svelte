<script lang="ts">
	import { enhance } from '$app/forms';
	import { AlertCircle, Briefcase, Mail, MapPin, Save, User } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';

	interface Props {
		profileChanges: any;
		originalProfile: any;
	}

	let { profileChanges = $bindable(), originalProfile }: Props = $props();

	const hasChanges = $derived(
		profileChanges.firstName !== (originalProfile.firstName || '') ||
			profileChanges.lastName !== (originalProfile.lastName || '') ||
			profileChanges.displayName !== (originalProfile.displayName || '') ||
			profileChanges.email !== (originalProfile.email || '') ||
			profileChanges.phoneNumber !== (originalProfile.phoneNumber || '') ||
			profileChanges.mobileNumber !== (originalProfile.mobileNumber || '') ||
			profileChanges.addressLine1 !== (originalProfile.addressLine1 || '') ||
			profileChanges.addressLine2 !== (originalProfile.addressLine2 || '') ||
			profileChanges.city !== (originalProfile.city || '') ||
			profileChanges.stateProvince !== (originalProfile.stateProvince || '') ||
			profileChanges.postalCode !== (originalProfile.postalCode || '') ||
			profileChanges.country !== (originalProfile.country || 'United States')
	);
</script>

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
						<h4 class="flex items-center gap-2 text-sm font-semibold">
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
									value={originalProfile.firstName || ''}
								/>
							</div>

							<!-- Last Name -->
							<div class="grid gap-2">
								<Label for="lastName">Last Name *</Label>
								<Input
									id="lastName"
									name="lastName"
									bind:value={profileChanges.lastName}
									required
								/>
								<input
									type="hidden"
									name="current_lastName"
									value={originalProfile.lastName || ''}
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
								value={originalProfile.displayName || ''}
							/>
						</div>
					</div>

					<!-- Contact Information Section -->
					<div class="space-y-4 border-t pt-4">
						<h4 class="flex items-center gap-2 text-sm font-semibold">
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
								<input type="hidden" name="current_email" value={originalProfile.email || ''} />
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
										value={originalProfile.phoneNumber || ''}
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
										value={originalProfile.mobileNumber || ''}
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Address Section -->
					<div class="space-y-4 border-t pt-4">
						<h4 class="flex items-center gap-2 text-sm font-semibold">
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
									value={originalProfile.addressLine1 || ''}
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
									value={originalProfile.addressLine2 || ''}
								/>
							</div>

							<!-- City, State, Postal Code -->
							<div class="grid gap-4 md:grid-cols-3">
								<div class="grid gap-2">
									<Label for="city">City</Label>
									<Input id="city" name="city" bind:value={profileChanges.city} />
									<input type="hidden" name="current_city" value={originalProfile.city || ''} />
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
										value={originalProfile.stateProvince || ''}
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
										value={originalProfile.postalCode || ''}
									/>
								</div>
							</div>

							<!-- Country -->
							<div class="grid gap-2">
								<Label for="country">Country</Label>
								<Input id="country" name="country" bind:value={profileChanges.country} />
								<input
									type="hidden"
									name="current_country"
									value={originalProfile.country || ''}
								/>
							</div>
						</div>
					</div>

					<!-- HR-Managed Fields (Read-Only) -->
					<div class="space-y-4 border-t pt-4">
						<h4 class="flex items-center gap-2 text-sm font-semibold">
							<Briefcase class="h-4 w-4" />
							Company Information (Managed by HR)
						</h4>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="rounded-lg border bg-muted/50 p-3">
								<Label class="text-xs text-muted-foreground">Department</Label>
								<p class="text-sm font-medium">
									{originalProfile.department?.name || 'Not assigned'}
								</p>
							</div>

							<div class="rounded-lg border bg-muted/50 p-3">
								<Label class="text-xs text-muted-foreground">Hire Date</Label>
								<p class="text-sm font-medium">
									{originalProfile.hireDate
										? new Date(originalProfile.hireDate).toLocaleDateString()
										: 'Not set'}
								</p>
							</div>

							<div class="rounded-lg border bg-muted/50 p-3">
								<Label class="text-xs text-muted-foreground">Role</Label>
								<p class="text-sm font-medium capitalize">
									{originalProfile.role?.replace(/_/g, ' ') || 'Employee'}
								</p>
							</div>

							<div class="rounded-lg border bg-muted/50 p-3">
								<Label class="text-xs text-muted-foreground">Status</Label>
								<p class="text-sm font-medium">
									{originalProfile.isActive ? 'Active' : 'Inactive'}
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
