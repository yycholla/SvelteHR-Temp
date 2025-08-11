<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import CardDescription from '$lib/components/ui/card/card-description.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import { Globe } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Admin - Integrations</title>
</svelte:head>

<Card>
  <CardHeader>
    <CardTitle class="flex items-center"><Globe class="h-5 w-5 mr-2" /> Integrations</CardTitle>
    <CardDescription>Third-party integrations (placeholder)</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="text-sm text-muted-foreground">Coming soon.</div>
  </CardContent>
</Card>

