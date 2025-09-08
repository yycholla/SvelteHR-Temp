<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { Activity } from 'lucide-svelte';
	let cpu = 23,
		mem = 45,
		disk = 67;
</script>

<svelte:head>
	<title>Admin - Monitoring</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center"
			><Activity class="mr-2 h-5 w-5" /> System Monitoring</CardTitle
		>
		<CardDescription>Resource utilization (placeholder)</CardDescription>
	</CardHeader>
	<CardContent class="space-y-4">
		<div>
			<div class="mb-1 flex items-center justify-between">
				<span>CPU</span><span class="text-sm text-muted-foreground">{cpu}%</span>
			</div>
			<Progress value={cpu} class="h-2" />
		</div>
		<div>
			<div class="mb-1 flex items-center justify-between">
				<span>Memory</span><span class="text-sm text-muted-foreground">{mem}%</span>
			</div>
			<Progress value={mem} class="h-2" />
		</div>
		<div>
			<div class="mb-1 flex items-center justify-between">
				<span>Disk</span><span class="text-sm text-muted-foreground">{disk}%</span>
			</div>
			<Progress value={disk} class="h-2" />
		</div>
	</CardContent>
</Card>
