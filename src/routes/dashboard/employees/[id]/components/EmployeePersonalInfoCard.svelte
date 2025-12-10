<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Building2, Clock, MapPin, User } from '@lucide/svelte';
	import { calculateTenure, formatDate, formatRole, getInitials } from '../utils';

	interface Props {
		employee: any;
	}

	const { employee }: Props = $props();
</script>

<div
	class="group relative row-span-2 flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 md:col-span-2 lg:col-span-2"
>
	<div class="absolute top-0 right-0 p-6 opacity-5 transition-opacity group-hover:opacity-10">
		<User class="h-48 w-48" />
	</div>

	<div class="z-10 flex items-start gap-6">
		<div
			class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-background bg-muted text-3xl font-bold shadow-lg"
		>
			{getInitials(employee.displayName)}
		</div>
		<div>
			<div class="mb-1 flex items-center gap-3">
				<h1 class="text-3xl font-bold tracking-tight">{employee.displayName}</h1>
				<Badge
					variant={employee.isActive ? 'default' : 'secondary'}
					class="pointer-events-none"
				>
					{employee.isActive ? 'Active' : 'Inactive'}
				</Badge>
			</div>
			<p class="mb-4 text-lg text-muted-foreground">{employee.jobTitle || 'No Job Title'}</p>

			<div class="flex flex-wrap gap-3 text-sm">
				{#if employee.department}
					<div
						class="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 text-muted-foreground"
					>
						<Building2 class="h-4 w-4" />
						{employee.department.name}
					</div>
				{/if}
				{#if employee.city && employee.stateProvince}
					<div
						class="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 text-muted-foreground"
					>
						<MapPin class="h-4 w-4" />
						{employee.city}, {employee.stateProvince}
					</div>
				{/if}
				<div
					class="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 text-muted-foreground"
				>
					<Clock class="h-4 w-4" />
					{formatRole(employee.role)}
				</div>
			</div>
		</div>
	</div>

	<div class="z-10 mt-8 grid grid-cols-2 gap-4 border-t border-border/50 pt-6 sm:grid-cols-4">
		<div>
			<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Employee ID</p>
			<p class="font-mono font-medium text-sm truncate" title={employee.id}>
				{employee.id.split('-')[0]}...
			</p>
		</div>
		<div>
			<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Join Date</p>
			<p class="font-medium">{formatDate(employee.hireDate)}</p>
		</div>
		<div>
			<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Manager</p>
			{#if employee.department?.userByManagerId}
				<div class="flex items-center gap-2">
					<div
						class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary"
					>
						{getInitials(employee.department.userByManagerId.displayName)}
					</div>
					<p class="truncate font-medium text-sm">
						{employee.department.userByManagerId.displayName}
					</p>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">None</p>
			{/if}
		</div>
		<div>
			<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Tenure</p>
			<p class="font-medium">{calculateTenure(employee.hireDate)}</p>
		</div>
	</div>
</div>