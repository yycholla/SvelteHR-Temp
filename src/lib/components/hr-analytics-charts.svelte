<script lang="ts">
	import EmployeeGrowthChart from './analytics/EmployeeGrowthChart.svelte';
	import type { User } from './analytics/growth-data';

	interface Props {
		users: User[];
	}

	const { users }: Props = $props();
</script>

<EmployeeGrowthChart {users} />
