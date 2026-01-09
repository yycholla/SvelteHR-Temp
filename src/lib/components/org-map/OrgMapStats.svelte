<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	interface Props {
		stats: {
			total: number;
			byLevel: {
				executive: number;
				management: number;
				senior: number;
				staff: number;
			};
			departments: number;
		};
	}

	const { stats }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
	<Card.Root>
		<Card.Content class="p-4">
			<div class="text-center">
				<div class="text-2xl font-bold">{stats.total}</div>
				<div class="text-xs text-muted-foreground">Total Employees</div>
			</div>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Content class="p-4">
			<div class="text-center">
				<div class="text-2xl font-bold text-red-600">{stats.byLevel.executive}</div>
				<div class="text-xs text-muted-foreground">Executive</div>
			</div>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Content class="p-4">
			<div class="text-center">
				<div class="text-2xl font-bold text-purple-600">{stats.byLevel.management}</div>
				<div class="text-xs text-muted-foreground">Management</div>
			</div>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Content class="p-4">
			<div class="text-center">
				<div class="text-2xl font-bold text-blue-600">{stats.byLevel.senior}</div>
				<div class="text-xs text-muted-foreground">Senior</div>
			</div>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Content class="p-4">
			<div class="text-center">
				<div class="text-2xl font-bold text-gray-600">{stats.byLevel.staff}</div>
				<div class="text-xs text-muted-foreground">Staff</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
