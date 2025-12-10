<script lang="ts">
	import { Briefcase } from '@lucide/svelte';

	interface Props {
		employee: any;
		formatDate: (date: string) => string;
	}

	const { employee, formatDate }: Props = $props();
</script>

<div class="rounded-xl border bg-card p-5 md:col-span-2">
	<div class="mb-5 flex items-center gap-2 text-muted-foreground">
		<Briefcase class="h-4 w-4" />
		<span class="text-xs font-semibold uppercase tracking-wider">Role</span>
	</div>

	<div class="relative pl-2">
		<!-- Timeline Line -->
		<div class="absolute top-2 bottom-2 left-[7px] w-[2px] bg-border"></div>

		<!-- Current Role -->
		<div class="relative pb-6 pl-6">
			<div
				class="absolute top-1.5 left-0 z-10 h-4 w-4 rounded-full border-2 border-primary bg-background"
			></div>
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h4 class="text-sm font-semibold">{employee.jobTitle || 'No Title'}</h4>
					<p class="text-xs text-muted-foreground">
						{employee.department?.name || 'No Department'} • {employee.role}
					</p>
				</div>
				<span class="mt-1 text-xs font-mono text-muted-foreground sm:mt-0">
					{new Date(employee.hireDate).getFullYear()} - Present
				</span>
			</div>
		</div>

		<!-- Placeholder for previous roles (could be fetched if history table exists) -->
		<div class="relative pl-6">
			<div
				class="absolute top-1.5 left-0 z-10 h-4 w-4 rounded-full border-2 border-muted-foreground/30 bg-background"
			></div>
			<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h4 class="text-sm font-semibold text-muted-foreground">Joined Company</h4>
					<p class="text-xs text-muted-foreground">Onboarding</p>
				</div>
				<span class="mt-1 text-xs font-mono text-muted-foreground sm:mt-0">
					{formatDate(employee.hireDate)}
				</span>
			</div>
		</div>
	</div>
</div>
