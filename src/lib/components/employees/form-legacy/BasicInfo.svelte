<script lang="ts">
	import Input from '../../base/Input.svelte';
	import Card from '../../base/Card.svelte';

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

<Card>
	<div class="form-section">
		<h3 class="form-section__title">Basic Information</h3>

		<div class="form-grid">
			<div class="form-field">
				<Input
					label="First Name"
					bind:value={firstName}
					required
					errorText={validationErrors.firstName}
					placeholder="Enter first name"
				/>
			</div>

			<div class="form-field">
				<Input
					label="Last Name"
					bind:value={lastName}
					required
					errorText={validationErrors.lastName}
					placeholder="Enter last name"
				/>
			</div>

			<div class="form-field">
				<Input
					label="Email"
					type="email"
					bind:value={email}
					required
					disabled={isEditing}
					errorText={validationErrors.email}
					placeholder="Enter email address"
				/>
			</div>

			<div class="form-field">
				<Input
					label="Phone Number"
					type="tel"
					bind:value={phoneNumber}
					errorText={validationErrors.phoneNumber}
					placeholder="Enter phone number"
				/>
			</div>
		</div>
	</div>
</Card>
