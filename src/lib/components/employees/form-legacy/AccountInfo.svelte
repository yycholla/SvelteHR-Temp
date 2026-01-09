<script lang="ts">
	import Input from '../../base/Input.svelte';
	import Select from '../../base/Select.svelte';
	import Card from '../../base/Card.svelte';

	interface Props {
		username?: string;
		password?: string;
		confirmPassword?: string;
		roleIds: string[];
		validationErrors: Record<string, string>;
		roleOptions: any[];
		isEditing: boolean;
	}

	let {
		username = $bindable(),
		password = $bindable(),
		confirmPassword = $bindable(),
		roleIds = $bindable(),
		validationErrors,
		roleOptions,
		isEditing
	}: Props = $props();
</script>

{#if !isEditing}
	<Card>
		<div class="form-section">
			<h3 class="form-section__title">Account Information</h3>

			<div class="form-grid">
				<div class="form-field">
					<Input
						label="Username"
						bind:value={username}
						required
						errorText={validationErrors.username}
						placeholder="Enter username"
					/>
				</div>

				<div class="form-field">
					<Select
						label="Role"
						options={roleOptions}
						bind:value={roleIds[0]}
						required
						placeholder="Select role"
					/>
				</div>

				<div class="form-field">
					<Input
						label="Password"
						type="password"
						bind:value={password}
						required
						errorText={validationErrors.password}
						placeholder="Enter password"
						helperText="Minimum 8 characters"
					/>
				</div>

				<div class="form-field">
					<Input
						label="Confirm Password"
						type="password"
						bind:value={confirmPassword}
						required
						errorText={validationErrors.confirmPassword}
						placeholder="Confirm password"
					/>
				</div>
			</div>
		</div>
	</Card>
{/if}
