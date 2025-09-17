<script lang="ts">
  import { onMount } from 'svelte';
  import { authActions } from '$lib/stores/auth';

  /**
   * Authentication Guard Component
   * Initializes auth state and provides authentication context
   * Use this at the app root level to ensure auth is initialized
   */

  let initComplete = false;

  onMount(async () => {
    // Initialize authentication state by validating current session
    try {
      await authActions.validateSession();
    } catch (error) {
      // Ignore initialization errors - user is simply not authenticated
      console.log('Auth initialization: user not authenticated');
    }
    initComplete = true;
  });
</script>

{#if initComplete}
  <!-- Auth is initialized, render app -->
  <slot />
{:else}
  <!-- Show loading while initializing auth -->
  <div class="fixed inset-0 bg-white flex items-center justify-center">
    <div class="text-center">
      <!-- Loading Spinner -->
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
{/if}

<style>
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>