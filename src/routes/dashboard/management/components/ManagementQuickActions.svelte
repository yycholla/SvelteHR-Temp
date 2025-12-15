<script lang="ts">
	import {
		Activity,
		Award,
		BarChart,
		Calendar,
		Clock,
		FileText,
		Target,
		Users
	} from '@lucide/svelte';

	interface Props {
		quickActions: any[];
	}

	const { quickActions }: Props = $props();

	// Icon mapping for dynamic icons
	const iconMap: Record<string, any> = {
		Calendar,
		Award,
		Target,
		FileText,
		Users,
		Activity,
		Clock,
		BarChart
	};
</script>

<div class="mb-8 rounded-lg border border bg-card p-6 shadow-sm">
	<h3 class="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		{#each quickActions as action}
			{@const Icon = iconMap[action.icon] || Activity}
			<a
				href={action.href}
				class={`block rounded-lg border border p-4 hover:border-${action.color}-300 hover:bg-${action.color}-50 group transition-colors`}
			>
				<div class="mb-2 flex items-center justify-between">
					<div
						class={`p-2 bg-${action.color}-100 rounded-lg group-hover:bg-${action.color}-200 transition-colors`}
					>
						<Icon class={`h-5 w-5 text-${action.color}-600`} />
					</div>
					{#if action.count > 0}
						<span
							class={`px-2 py-1 bg-${action.color}-100 text-${action.color}-800 rounded-full text-xs font-medium`}
						>
							{action.count}
						</span>
					{/if}
				</div>
				<h4 class="mb-1 font-medium text-foreground">{action.title}</h4>
				<p class="text-sm text-muted-foreground">{action.description}</p>
			</a>
		{/each}
	</div>
</div>
