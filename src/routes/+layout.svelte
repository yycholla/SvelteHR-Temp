<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { isAuthenticated, authStore } from '$lib/stores/auth';
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
  import { setContextClient } from '@urql/svelte';
  import { createUrqlClient } from '$lib/graphql/client';
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';

  // Initialize PostGraphile GraphQL client for the entire app
  setContextClient(createUrqlClient());

  let { children } = $props();

  // Track if we're on an auth page  
  const isAuthPage = $derived(
    $page.url.pathname === '/login' || 
    $page.url.pathname === '/auth/register' ||
    $page.url.pathname === '/auth/forgot-password'
  );
  const shouldShowLayout = $derived($isAuthenticated && !isAuthPage);

  onMount(() => {
    // Auto-refresh token every 14 minutes (before 15 minute expiry)
    const tokenRefreshInterval = setInterval(() => {
      if ($isAuthenticated) {
        authStore.refreshAccessToken();
      }
    }, 14 * 60 * 1000);

    return () => {
      clearInterval(tokenRefreshInterval);
    };
  });
</script>

<svelte:head>
  <title>SvelteHR - HR Management System</title>
  <meta name="description" content="Comprehensive HR management system for modern organizations" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Wrap entire app with AuthGuard for auth initialization -->
<AuthGuard>
  {#if shouldShowLayout}
    <DashboardLayout>
      {@render children?.()}
    </DashboardLayout>
  {:else}
    <main class="auth-layout">
      {@render children?.()}
    </main>
  {/if}
</AuthGuard>

<style>
  :global(html) {
    height: 100%;
  }

  :global(body) {
    height: 100%;
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :global(#app) {
    height: 100%;
  }

  .auth-layout {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f9fafb;
  }
</style>
