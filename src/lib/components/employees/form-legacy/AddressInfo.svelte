<script lang="ts">
	import Input from '../../base/Input.svelte';
	import Card from '../../base/Card.svelte';

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

<Card>
	<div class="form-section">
		<h3 class="form-section__title">Address Information</h3>

		<div class="form-grid">
			<div class="form-field form-field--full-width">
				<Input
					label="Street Address"
					bind:value={addressStreet}
					placeholder="Enter street address"
				/>
			</div>

			<div class="form-field">
				<Input label="City" bind:value={addressCity} placeholder="Enter city" />
			</div>

			<div class="form-field">
				<Input label="State" bind:value={addressState} placeholder="Enter state" />
			</div>

			<div class="form-field">
				<Input
					label="ZIP Code"
					bind:value={addressZipCode}
					placeholder="Enter ZIP code"
				/>
			</div>
		</div>
	</div>
</Card>
