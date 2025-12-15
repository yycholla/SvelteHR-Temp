<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { BarChart3, Building, Crown, Users } from '@lucide/svelte';

	interface Props {
		teamStats: {
			totalTeams: number;
			totalEmployees: number;
			averageTeamSize: number;
			teamsWithHeads: number;
		};
	}

	let { teamStats }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Total Teams</Card.Title>
			<Building class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{teamStats.totalTeams}</div>
			<p class="text-xs text-muted-foreground">organizational units</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Total Employees</Card.Title>
			<Users class="h-4 w-4 text-blue-600" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold text-blue-600">{teamStats.totalEmployees}</div>
			<p class="text-xs text-muted-foreground">across all teams</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Average Team Size</Card.Title>
			<BarChart3 class="h-4 w-4 text-green-600" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold text-green-600">{teamStats.averageTeamSize}</div>
			<p class="text-xs text-muted-foreground">employees per team</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Teams with Heads</Card.Title>
			<Crown class="h-4 w-4 text-yellow-600" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold text-yellow-600">{teamStats.teamsWithHeads}</div>
			<p class="text-xs text-muted-foreground">
				{teamStats.totalTeams > 0
					? Math.round((teamStats.teamsWithHeads / teamStats.totalTeams) * 100)
					: 0}% have leadership
			</p>
		</Card.Content>
	</Card.Root>
</div>
