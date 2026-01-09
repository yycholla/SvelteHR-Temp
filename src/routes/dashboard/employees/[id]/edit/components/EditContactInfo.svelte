<script lang="ts">
	import { Phone } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		phoneNumber: string;
		mobileNumber: string;
		addressLine1: string;
		addressLine2: string;
		city: string;
		stateProvince: string;
		postalCode: string;
		country: string;
	}

	let {
		phoneNumber = $bindable(),
		mobileNumber = $bindable(),
		addressLine1 = $bindable(),
		addressLine2 = $bindable(),
		city = $bindable(),
		stateProvince = $bindable(),
		postalCode = $bindable(),
		country = $bindable()
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center gap-2">
			<Phone class="h-4 w-4" />
			<Card.Title class="text-base">Contact Information</Card.Title>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3">
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="phoneNumber" class="text-sm">Phone Number</Label>
				<Input
					id="phoneNumber"
					name="phoneNumber"
					type="tel"
					bind:value={phoneNumber}
					placeholder="(555) 123-4567"
					class="h-9"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="mobileNumber" class="text-sm">Mobile Number</Label>
				<Input
					id="mobileNumber"
					name="mobileNumber"
					type="tel"
					bind:value={mobileNumber}
					placeholder="(555) 987-6543"
					class="h-9"
				/>
			</div>
		</div>

		<div class="space-y-1.5">
			<Label for="addressLine1" class="text-sm">Address Line 1</Label>
			<Input
				id="addressLine1"
				name="addressLine1"
				type="text"
				bind:value={addressLine1}
				placeholder="123 Main Street"
				class="h-9"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="addressLine2" class="text-sm">Address Line 2</Label>
			<Input
				id="addressLine2"
				name="addressLine2"
				type="text"
				bind:value={addressLine2}
				placeholder="Apt 4B"
				class="h-9"
			/>
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<div class="space-y-1.5">
				<Label for="city" class="text-sm">City</Label>
				<Input
					id="city"
					name="city"
					type="text"
					bind:value={city}
					placeholder="San Francisco"
					class="h-9"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="stateProvince" class="text-sm">State</Label>
				<Input
					id="stateProvince"
					name="stateProvince"
					type="text"
					bind:value={stateProvince}
					placeholder="CA"
					class="h-9"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="postalCode" class="text-sm">Postal Code</Label>
				<Input
					id="postalCode"
					name="postalCode"
					type="text"
					bind:value={postalCode}
					placeholder="94102"
					class="h-9"
				/>
			</div>
		</div>

		<div class="space-y-1.5">
			<Label for="country" class="text-sm">Country</Label>
			<Input
				id="country"
				name="country"
				type="text"
				bind:value={country}
				placeholder="United States"
				class="h-9"
			/>
		</div>
	</Card.Content>
</Card.Root>
