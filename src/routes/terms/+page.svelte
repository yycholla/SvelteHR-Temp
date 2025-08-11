<script lang="ts">
  import Card from '$lib/components/ui/card/card.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
</script>

<svelte:head>
  <title>Terms of Service - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6 max-w-3xl">
  <Card>
    <CardHeader>
      <CardTitle>Terms of Service</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 text-sm text-muted-foreground">
      <p>This is a placeholder terms page.</p>
      <p>Replace with your organization terms of service.</p>
    </CardContent>
  </Card>
  </div>

