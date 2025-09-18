<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ShadcnLayout from '$lib/components/layout/ShadcnLayout.svelte';
  import EmployeeList from '$lib/components/employees/EmployeeListShadcn.svelte';
  import {
    currentUser,
    hasPermission,
    isAuthenticated,
    isLoading,
    authError,
    userRoles,
    getRBACManager
  } from '$lib/stores/auth';

  let authCheckComplete = $state(false);

  // Use onMount to avoid reactive loops
  onMount(() => {
    // Initial auth validation only
    const validateAccess = async () => {
      // Wait for auth to initialize
      let attempts = 0;
      while ($isLoading && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      console.log('=== Employee Page Permission Check ===');
      console.log('currentUser:', $currentUser);
      console.log('isAuthenticated:', $isAuthenticated);
      console.log('isLoading:', $isLoading);

      // If still no user after loading, redirect to login
      if (!$currentUser) {
        console.log('No current user, redirecting to login');
        goto('/login');
        return;
      }

      // Check if user has permission to view employees
      if (!hasPermission('view_users')) {
        console.log('User lacks view_users permission, redirecting to dashboard');
        goto('/dashboard');
        return;
      }

      console.log('Permission check passed, user can view employees');
      authCheckComplete = true;
    };

    validateAccess();
  });
</script>

<svelte:head>
  <title>Employees - SvelteHR</title>
  <meta name="description" content="View and manage all employees in your organization" />
</svelte:head>

{#if authCheckComplete}
  <ShadcnLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Employees</h1>
          <p class="text-muted-foreground">
            View and manage all employees in your organization
          </p>
        </div>
      </div>

      <EmployeeList />
    </div>
  </ShadcnLayout>
{/if}