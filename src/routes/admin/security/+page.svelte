<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import { Shield } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Admin - Security</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center"><Shield class="mr-2 h-5 w-5" /> Security</CardTitle>
		<CardDescription>Security settings and logs (placeholder)</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="text-sm text-muted-foreground">Connect to your backend to show audit logs.</div>
	</CardContent>
</Card>
