<script lang="ts">
	import { Mail, Phone } from '@lucide/svelte';

	interface Props {
		employee: any;
		canViewContactInfo: boolean;
	}

	const { employee, canViewContactInfo }: Props = $props();
</script>

<div class="flex flex-col justify-center rounded-xl border bg-card p-5">
	<div class="mb-4 flex items-center gap-2 text-muted-foreground">
		<Mail class="h-4 w-4" />
		<span class="text-xs font-semibold uppercase tracking-wider">Contact</span>
	</div>
	<div class="space-y-4">
		{#if canViewContactInfo}
			<div>
				<p class="mb-0.5 text-xs text-muted-foreground">Work Email</p>
				<a
					href="mailto:{employee.email}"
					class="block truncate text-sm font-medium hover:text-primary hover:underline"
					>{employee.email}</a
				>
			</div>
			{#if employee.phoneNumber}
				<div>
					<p class="mb-0.5 text-xs text-muted-foreground">Phone</p>
					<p class="text-sm font-medium">{employee.phoneNumber}</p>
				</div>
			{/if}
			{#if employee.mobileNumber}
				<div>
					<p class="mb-0.5 text-xs text-muted-foreground">Mobile</p>
					<p class="text-sm font-medium">{employee.mobileNumber}</p>
				</div>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">Contact info hidden</p>
		{/if}
	</div>
</div>
