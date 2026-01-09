<script lang="ts">
	import Input from '../../base/Input.svelte';
	import Select from '../../base/Select.svelte';
	import Card from '../../base/Card.svelte';

	interface Props {
		emergencyContactName: string;
		emergencyContactPhone: string;
		emergencyContactRelationship: string;
		relationshipOptions: any[];
	}

	let {
		emergencyContactName = $bindable(),
		emergencyContactPhone = $bindable(),
		emergencyContactRelationship = $bindable(),
		relationshipOptions
	}: Props = $props();
</script>

<Card>
	<div class="form-section">
		<h3 class="form-section__title">Emergency Contact</h3>

		<div class="form-grid">
			<div class="form-field">
				<Input
					label="Contact Name"
					bind:value={emergencyContactName}
					placeholder="Enter emergency contact name"
				/>
			</div>

			<div class="form-field">
				<Input
					label="Contact Phone"
					type="tel"
					bind:value={emergencyContactPhone}
					placeholder="Enter emergency contact phone"
				/>
			</div>

			<div class="form-field">
				<Select
					label="Relationship"
					options={relationshipOptions}
					bind:value={emergencyContactRelationship}
					placeholder="Select relationship"
				/>
			</div>
		</div>
	</div>
</Card>
