<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		jobTitle: string;
		departmentId: string;
		hireDate: string;
		role: string;
		departments: Array<{ id: string; name: string }>;
		roleOptions: Array<{ value: string; label: string; description: string }>;
		fieldErrors: Record<string, string>;
		submitting: boolean;
		onValidate: (field: string, value: string) => void;
	}

	let {
		jobTitle = $bindable(),
		departmentId = $bindable(),
		hireDate = $bindable(),
		role = $bindable(),
		departments,
		roleOptions,
		fieldErrors,
		submitting,
		onValidate
	}: Props = $props();
</script>

<div class="space-y-4">
	<h3 class="text-sm font-semibold text-muted-foreground">Employment Details</h3>

	<div class="space-y-2">
		<Label for="jobTitle">Job Title</Label>
		<Input
			id="jobTitle"
			name="jobTitle"
			bind:value={jobTitle}
			placeholder="Software Engineer"
			disabled={submitting}
		/>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<Label for="departmentId">
				Department <span class="text-red-500">*</span>
			</Label>
			<select
				id="departmentId"
				name="departmentId"
				bind:value={departmentId}
				onchange={() => onValidate('departmentId', departmentId)}
				required
				disabled={submitting}
				class="shadow-xs flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 {fieldErrors.departmentId
					? 'border-red-500 focus-visible:ring-red-500'
					: ''}"
			>
				{#each departments as dept (dept.id)}
					<option value={dept.id}>{dept.name}</option>
				{/each}
			</select>
			{#if fieldErrors.departmentId}
				<p class="text-sm text-red-500">{fieldErrors.departmentId}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="hireDate">
				Hire Date <span class="text-red-500">*</span>
			</Label>
			<Input
				id="hireDate"
				name="hireDate"
				type="date"
				bind:value={hireDate}
				required
				disabled={submitting}
			/>
		</div>
	</div>

	<div class="space-y-2">
		<Label for="role">
			Role <span class="text-red-500">*</span>
		</Label>
		<select
			id="role"
			name="role"
			bind:value={role}
			onchange={() => onValidate('role', role)}
			required
			disabled={submitting}
			class="shadow-xs w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none ring-offset-background transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/80 md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 {fieldErrors.role
				? 'border-red-500 focus-visible:ring-red-500'
				: ''}"
		>
			{#each roleOptions as roleOpt (roleOpt.value)}
				<option value={roleOpt.value}>{roleOpt.label}</option>
			{/each}
		</select>
		{#if fieldErrors.role}
			<p class="text-sm text-red-500">{fieldErrors.role}</p>
		{:else}
			<p class="text-xs text-muted-foreground mt-1">
				{roleOptions.find((r) => r.value === role)?.description}
			</p>
		{/if}
	</div>
</div>
