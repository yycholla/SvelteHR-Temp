<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import PerformanceDashboard from '$lib/components/monitoring/PerformanceDashboard.svelte';

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser || !hasPermission('admin:monitoring')) {
      goto('/dashboard');
      return;
    }
  });
</script>

<svelte:head>
  <title>Performance Monitoring - MountainHR Admin</title>
  <meta name="description" content="Application performance monitoring and diagnostics" />
</svelte:head>

{#if $currentUser && hasPermission('admin:monitoring')}
  <PerformanceDashboard />
{:else}
  <div class="access-denied">
    <div class="access-denied-content">
      <i class="icon-shield-off access-denied-icon"></i>
      <h2 class="access-denied-title">Access Denied</h2>
      <p class="access-denied-message">
        You don't have permission to view performance monitoring data.
      </p>
    </div>
  </div>
{/if}

<style lang="postcss">
  .access-denied {
    @apply flex items-center justify-center min-h-96;
  }

  .access-denied-content {
    @apply text-center space-y-4;
  }

  .access-denied-icon {
    @apply w-16 h-16 mx-auto text-gray-400;
  }

  .access-denied-title {
    @apply text-2xl font-bold text-gray-900;
  }

  .access-denied-message {
    @apply text-gray-600 max-w-md mx-auto;
  }
</style>