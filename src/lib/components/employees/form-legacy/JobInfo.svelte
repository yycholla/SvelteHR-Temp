<script lang="ts">
	import Input from '../../base/Input.svelte';
	import Select from '../../base/Select.svelte';
	import Card from '../../base/Card.svelte';

	interface Props {
		jobTitle: string;
		departmentId: string;
		employmentType: string;
		hireDate: string;
		managerId: string;
		payType: string;
		salary: string;
		isRemote: boolean;
		validationErrors: Record<string, string>;
		isEditing: boolean;
		departmentOptions: any[];
		employmentTypeOptions: any[];
		managerOptions: any[];
		payTypeOptions: any[];
	}

	let {
		jobTitle = $bindable(),
		departmentId = $bindable(),
		employmentType = $bindable(),
		hireDate = $bindable(),
		managerId = $bindable(),
		payType = $bindable(),
		salary = $bindable(),
		isRemote = $bindable(),
		validationErrors,
		isEditing,
		departmentOptions,
		employmentTypeOptions,
		managerOptions,
		payTypeOptions
	}: Props = $props();
</script>

<Card>
	<div class="form-section">
		<h3 class="form-section__title">Employment Information</h3>

		<div class="form-grid">
			<div class="form-field">
				<Input
					label="Job Title"
					bind:value={jobTitle}
					required
					errorText={validationErrors.jobTitle}
					placeholder="Enter job title"
				/>
			</div>

			<div class="form-field">
				<Select
					label="Department"
					options={departmentOptions}
					bind:value={departmentId}
					required
					errorText={validationErrors.departmentId}
					placeholder="Select department"
				/>
			</div>

			<div class="form-field">
				<Select
					label="Employment Type"
					options={employmentTypeOptions}
					bind:value={employmentType}
					required
				/>
			</div>

			<div class="form-field">
				<Input
					label="Hire Date"
					type="date"
					bind:value={hireDate}
					required={!isEditing}
					disabled={isEditing}
					errorText={validationErrors.hireDate}
				/>
			</div>

			<div class="form-field">
				<Select
					label="Manager"
					options={managerOptions}
					bind:value={managerId}
					placeholder="Select manager (optional)"
				/>
			</div>

			<div class="form-field">
				<Select label="Pay Type" options={payTypeOptions} bind:value={payType} />
			</div>

			<div class="form-field">
				<Input
					label="Salary"
					type="number"
					bind:value={salary}
					placeholder="Enter salary amount"
					helperText="Annual salary or hourly rate"
				/>
			</div>

			<div class="form-field form-field--checkbox">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={isRemote} class="checkbox-input" />
					<span class="checkbox-text">Remote Employee</span>
				</label>
			</div>
		</div>
	</div>
</Card>
