<script lang="ts">
	import { UserIcon } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		firstName: string;
		lastName: string;
		email: string;
		phoneNumber: string;
		validationErrors: Record<string, string>;
		isEditing: boolean;
	}

	let {
		firstName = $bindable(),
		lastName = $bindable(),
		email = $bindable(),
		phoneNumber = $bindable(),
		validationErrors,
		isEditing
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<UserIcon class="h-5 w-5" />
			Basic Information
		</Card.Title>
		<Card.Description>Personal details and contact information</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="firstName">First Name *</Label>
				<Input
					id="firstName"
					bind:value={firstName}
					placeholder="Enter first name"
					class={validationErrors.firstName ? 'border-destructive' : ''}
				/>
				{#if validationErrors.firstName}
					<p class="text-sm text-destructive">{validationErrors.firstName}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="lastName">Last Name *</Label>
				<Input
					id="lastName"
					bind:value={lastName}
					placeholder="Enter last name"
					class={validationErrors.lastName ? 'border-destructive' : ''}
				/>
				{#if validationErrors.lastName}
					<p class="text-sm text-destructive">{validationErrors.lastName}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="email">Email *</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					placeholder="Enter email address"
					disabled={isEditing}
					class={validationErrors.email ? 'border-destructive' : ''}
				/>
				{#if validationErrors.email}
					<p class="text-sm text-destructive">{validationErrors.email}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="phoneNumber">Phone Number</Label>
				<Input
					id="phoneNumber"
					type="tel"
					bind:value={phoneNumber}
					placeholder="Enter phone number"
					class={validationErrors.phoneNumber ? 'border-destructive' : ''}
				/>
				{#if validationErrors.phoneNumber}
					<p class="text-sm text-destructive">{validationErrors.phoneNumber}</p>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
