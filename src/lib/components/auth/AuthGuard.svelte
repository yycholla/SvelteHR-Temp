<script lang="ts">
  import { onMount } from 'svelte';
  import { authActions } from '$lib/stores/auth';

  /**
   * Authentication Guard Component
   * Initializes auth state and provides authentication context
   * Use this at the app root level to ensure auth is initialized
   */

  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { authStore } from '$lib/stores/auth';

  let initComplete = false;

  onMount(async () => {
    console.log('AuthGuard: Starting authentication initialization');

    // Check if auth is already initialized (has user or has been validated)
    const currentState = get(authStore);
    if (currentState.isAuthenticated && currentState.user) {
      console.log('AuthGuard: Auth already initialized with valid user');
      initComplete = true;
      return;
    }

    // Initialize authentication state by validating current session
    try {
      console.log('AuthGuard: Validating current session');
      const isValid = await authActions.validateSession();

      if (isValid) {
        console.log('AuthGuard: Session validation successful');
      } else {
        console.log('AuthGuard: No valid session found');
      }
    } catch (error) {
      // Log the error but don't throw - user is simply not authenticated
      console.log('AuthGuard: Session validation failed:', error.message);
    } finally {
      initComplete = true;
    }
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