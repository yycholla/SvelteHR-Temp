<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Plus } from 'lucide-svelte';
	let showCreate = $state(false);
</script>

<svelte:head>
	<title>Admin - Users</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold tracking-tight">User Management</h2>
		<Button onclick={() => (showCreate = true)}><Plus class="mr-2 h-4 w-4" /> New User</Button>
	</div>
	<Card>
		<CardHeader>
			<CardTitle>Users</CardTitle>
			<CardDescription>List of system users (placeholder)</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="text-sm text-muted-foreground">Connect to your backend to list users.</div>
		</CardContent>
	</Card>

	{#if showCreate}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div class="w-full max-w-md rounded-xl border border-border bg-background p-6">
				<h3 class="mb-2 font-semibold">Create User</h3>
				<p class="mb-4 text-sm text-muted-foreground">Coming soon.</p>
				<div class="flex justify-end">
					<Button variant="outline" onclick={() => (showCreate = false)}>Close</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
