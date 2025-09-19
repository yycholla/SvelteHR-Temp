<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>Admin Panel - SvelteHR</title>
  <meta name="description" content="Administrative panel for SvelteHR system configuration" />
</svelte:head>

{@render children()}