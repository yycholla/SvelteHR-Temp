<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import OnboardingDashboard from '$lib/components/onboarding/OnboardingDashboard.svelte';
  import { currentUser, hasPermission } from '$lib/services/auth';

  // Check permissions on mount
  onMount(() => {
    // Redirect if user doesn't have permission to view onboarding
    if (!$currentUser || !hasPermission('onboarding:read')) {
      goto('/dashboard');
      return;
    }
  });
</script>

<svelte:head>
  <title>Onboarding - MountainHR</title>
  <meta name="description" content="Monitor and manage employee onboarding workflows" />
</svelte:head>

<div class="onboarding-page">
  <OnboardingDashboard />
</div>

<style lang="postcss">
  .onboarding-page {
    @apply w-full;
  }
</style>