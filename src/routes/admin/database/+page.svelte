<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Database } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Admin - Database</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center"><Database class="mr-2 h-5 w-5" /> Database</CardTitle>
		<CardDescription>Backup and maintenance (placeholder)</CardDescription>
	</CardHeader>
	<CardContent>
		<Button disabled>Run Backup (coming soon)</Button>
	</CardContent>
</Card>
