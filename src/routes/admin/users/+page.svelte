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
    <Button onclick={() => showCreate = true}><Plus class="h-4 w-4 mr-2" /> New User</Button>
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
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-background rounded-xl border border-border p-6 w-full max-w-md">
        <h3 class="font-semibold mb-2">Create User</h3>
        <p class="text-sm text-muted-foreground mb-4">Coming soon.</p>
        <div class="flex justify-end"><Button variant="outline" onclick={() => showCreate = false}>Close</Button></div>
      </div>
    </div>
  {/if}
</div>

