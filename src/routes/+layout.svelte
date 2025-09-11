<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth, isLoggedIn } from '$lib/services/auth';
  import { notificationService } from '$lib/services/notificationService';
  import DashboardLayout from '$lib/components/layout/DashboardLayout.svelte';
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  // Track if we're on an auth page  
  const isAuthPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');
  const shouldShowLayout = $derived($isLoggedIn && !isAuthPage);

  onMount(() => {
    // Initialize auth service
    auth.initialize();

    // Subscribe to notifications if logged in
    if ($isLoggedIn) {
      notificationService.subscribeToNotifications();
    }

    // Auto-refresh token every 15 minutes
    const tokenRefreshInterval = setInterval(() => {
      if ($isLoggedIn) {
        auth.refreshToken();
      }
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(tokenRefreshInterval);
      notificationService.unsubscribeFromNotifications();
    };
  });
</script>

<svelte:head>
  <title>MountainHR - HR Management System</title>
  <meta name="description" content="Comprehensive HR management system for modern organizations" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href={favicon} />
</svelte:head>

{#if shouldShowLayout}
  <DashboardLayout>
    {@render children?.()}
  </DashboardLayout>
{:else}
  <main class="auth-layout">
    {@render children?.()}
  </main>
{/if}

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
