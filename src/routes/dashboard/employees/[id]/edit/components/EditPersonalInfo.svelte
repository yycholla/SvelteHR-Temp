<script lang="ts">
	import { User } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		firstName: string;
		lastName: string;
		email: string;
		role: string;
		hireDate: string;
		departmentId: string;
		isActive: boolean;
		roleOptions: Array<{ value: string; label: string }>;
		departments: Array<{ id: string; name: string }>;
		formErrors: {
			firstName?: string;
			lastName?: string;
			email?: string;
		};
	}

	let {
		firstName = $bindable(),
		lastName = $bindable(),
		email = $bindable(),
		role = $bindable(),
		hireDate = $bindable(),
		departmentId = $bindable(),
		isActive = $bindable(),
		roleOptions,
		departments,
		formErrors
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header class="pb-3">
		<div class="flex items-center gap-2">
			<User class="h-4 w-4" />
			<Card.Title class="text-base">Personal Information</Card.Title>
		</div>
	</Card.Header>
	<Card.Content class="space-y-3">
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="firstName" class="text-sm"
					>First Name <span class="text-destructive">*</span></Label
				>
				<Input
					id="firstName"
					name="firstName"
					type="text"
					bind:value={firstName}
					placeholder="John"
					required
					class="h-9"
				/>
				{#if formErrors.firstName}
					<p class="text-xs text-destructive">{formErrors.firstName}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<Label for="lastName" class="text-sm"
					>Last Name <span class="text-destructive">*</span></Label
				>
				<Input
					id="lastName"
					name="lastName"
					type="text"
					bind:value={lastName}
					placeholder="Doe"
					required
					class="h-9"
				/>
				{#if formErrors.lastName}
					<p class="text-xs text-destructive">{formErrors.lastName}</p>
				{/if}
			</div>
		</div>

		<div class="space-y-1.5">
			<Label for="email" class="text-sm">Email <span class="text-destructive">*</span></Label>
			<Input
				id="email"
				name="email"
				type="email"
				bind:value={email}
				placeholder="john.doe@company.com"
				required
				class="h-9"
			/>
			{#if formErrors.email}
				<p class="text-xs text-destructive">{formErrors.email}</p>
			{/if}
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="role" class="text-sm">Role</Label>
				<select
					id="role"
					name="role"
					bind:value={role}
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					{#each roleOptions as roleOption}
						<option value={roleOption.value}>{roleOption.label}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-1.5">
				<Label for="hireDate" class="text-sm">Hire Date</Label>
				<Input id="hireDate" name="hireDate" type="date" bind:value={hireDate} class="h-9" />
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label for="departmentId" class="text-sm">Department</Label>
				<select
					id="departmentId"
					name="departmentId"
					bind:value={departmentId}
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					<option value="">Select Department</option>
					{#each departments as dept}
						<option value={dept.id}>{dept.name}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2 pt-6">
				<input type="hidden" name="isActive" value={isActive ? 'true' : 'false'} />
				<Checkbox id="isActive" bind:checked={isActive} />
				<Label for="isActive" class="text-sm font-normal">Active Employee</Label>
			</div>
		</div>
	</Card.Content>
</Card.Root>
