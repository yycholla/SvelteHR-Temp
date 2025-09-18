<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { isAuthenticated, isLoading, currentUser, authActions } from '$lib/stores/auth';
  import { permissionsService } from '$lib/services/permissionsService';
  import { Loading } from 'carbon-components-svelte';

  // Use session storage to prevent redirect loops across page reloads
  const REDIRECT_KEY = 'hr_root_redirected';

  onMount(async () => {
    // Ensure we only run this on the root page
    if ($page.url.pathname !== '/') return;

    // Small delay to allow AuthGuard to initialize auth state
    await new Promise(resolve => setTimeout(resolve, 300));

    // Now check the auth state (which AuthGuard has already validated)
    if ($isAuthenticated && $currentUser) {
      // Clear any lingering redirect flags
      if (browser) {
        sessionStorage.removeItem('hr_login_redirected');
        sessionStorage.removeItem('hr_root_redirected');
      }

      // Redirect to appropriate default page based on user role
      const isAdmin = permissionsService.isSuperAdmin($currentUser);
      await goto(isAdmin ? '/admin' : '/dashboard', { replaceState: true });
    } else {
      // Not authenticated, redirect to login
      await goto('/login', { replaceState: true });
    }
  });

  // Clear redirect flag when navigating away from root
  $: if (browser && $page.url.pathname !== '/') {
    sessionStorage.removeItem(REDIRECT_KEY);
  }
</script>

<svelte:head>
  <title>SvelteHR - HR Management System</title>
  <meta name="description" content="Comprehensive HR management system for modern organizations" />
</svelte:head>

<!-- Loading state while redirecting -->
<div class="redirect-loading carbon-loading-state">
  <div class="loading-spinner">
    <Loading withOverlay={false} />
  </div>
  <p class="loading-text">Loading SvelteHR...</p>
</div>

<style>
  .carbon-loading-state {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--cds-background);
    color: var(--cds-text-secondary);
    padding: var(--cds-spacing-06);
    gap: var(--cds-spacing-06);
  }

  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-text {
    font-size: var(--cds-body-short-01-font-size);
    font-weight: var(--cds-body-short-01-font-weight);
    line-height: var(--cds-body-short-01-line-height);
    color: var(--cds-text-secondary);
    text-align: center;
  }

  /* Ensure Carbon loading component is properly styled */
  :global(.carbon-loading-state .bx--loading) {
    position: static;
    transform: none;
  }

  /* Responsive adjustments */
  @media (max-width: 671px) {
    .carbon-loading-state {
      padding: var(--cds-spacing-05);
    }
  }
</style>
