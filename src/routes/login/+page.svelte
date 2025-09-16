<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated } from '$lib/stores/auth';
  import AuthLayout from '$lib/components/auth/AuthLayout.svelte';
  import LoginForm from '$lib/components/auth/LoginForm.svelte';

  /**
   * Login Page
   * Handles user authentication and redirects
   */

  let redirected = false;

  // Check if user is already authenticated on mount
  onMount(() => {
    // Use a timeout to allow auth state to stabilize
    setTimeout(() => {
      if (!redirected && $isAuthenticated) {
        redirected = true;
        const redirectTo = $page.url.searchParams.get('redirect') || '/dashboard';
        goto(redirectTo);
      }
    }, 100);
  });

  // Handle successful login
  const handleLoginSuccess = (event: CustomEvent) => {
    const redirectTo = $page.url.searchParams.get('redirect') || '/dashboard';
    goto(redirectTo);
  };

  // Handle login error
  const handleLoginError = (event: CustomEvent) => {
    console.error('Login error:', event.detail.message);
    // Error is already handled by the auth store and displayed in the form
  };
</script>

<svelte:head>
  <title>Sign In - SvelteHR</title>
  <meta name="description" content="Sign in to your SvelteHR account to access your HR dashboard." />
</svelte:head>

<!-- Use AuthLayout for consistent branding -->
<AuthLayout 
  title="SvelteHR"
  subtitle="Human Resources Management System"
>
  <LoginForm 
    on:success={handleLoginSuccess}
    on:error={handleLoginError}
  />
</AuthLayout>