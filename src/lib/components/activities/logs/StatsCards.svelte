<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	interface StatCard {
		label: string;
		value: number;
		icon: any;
		color: string;
		bgColor: string;
	}

	interface Props {
		statsCards: StatCard[];
	}

	let { statsCards }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
	{#each statsCards as stat}
		{@const Icon = stat.icon}
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium text-muted-foreground">
					{stat.label}
				</Card.Title>
				<div class="flex h-8 w-8 items-center justify-center rounded-full {stat.bgColor}">
					<Icon class="h-4 w-4 {stat.color}" />
				</div>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stat.value}</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
