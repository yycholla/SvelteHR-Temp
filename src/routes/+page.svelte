<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isLoggedIn } from '$lib/services/auth';

  // Redirect based on authentication status
  onMount(() => {
    if ($isLoggedIn) {
      goto('/dashboard');
    } else {
      goto('/login');
    }
  });
</script>

<svelte:head>
  <title>MountainHR - HR Management System</title>
  <meta name="description" content="Comprehensive HR management system for modern organizations" />
</svelte:head>

<!-- Loading state while redirecting -->
<div class="redirect-loading">
  <div class="loading-spinner">
    <svg class="animate-spin" viewBox="0 0 24 24">
      <circle 
        class="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        stroke-width="4" 
        fill="none"
      />
      <path 
        class="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
  <p>Loading MountainHR...</p>
</div>

<style lang="postcss">
  .redirect-loading {
    @apply min-h-screen flex flex-col items-center justify-center;
    background-color: #f9fafb;
    color: #6b7280;
  }

  .loading-spinner svg {
    @apply w-8 h-8 mb-4 text-blue-600;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
