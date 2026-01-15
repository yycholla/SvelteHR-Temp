<script lang="ts">
	import { MapPin } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		addressStreet: string;
		addressCity: string;
		addressState: string;
		addressZipCode: string;
	}

	let {
		addressStreet = $bindable(),
		addressCity = $bindable(),
		addressState = $bindable(),
		addressZipCode = $bindable()
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<MapPin class="h-5 w-5" />
			Address Information
		</Card.Title>
		<Card.Description>Home address and location details</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="space-y-2">
			<Label for="addressStreet">Street Address</Label>
			<Input id="addressStreet" bind:value={addressStreet} placeholder="Enter street address" />
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="space-y-2">
				<Label for="addressCity">City</Label>
				<Input id="addressCity" bind:value={addressCity} placeholder="Enter city" />
			</div>

			<div class="space-y-2">
				<Label for="addressState">State</Label>
				<Input id="addressState" bind:value={addressState} placeholder="Enter state" />
			</div>

			<div class="space-y-2">
				<Label for="addressZipCode">ZIP Code</Label>
				<Input id="addressZipCode" bind:value={addressZipCode} placeholder="Enter ZIP code" />
			</div>
		</div>
	</Card.Content>
</Card.Root>
