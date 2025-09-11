<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import EmployeeList from '$lib/components/employees/EmployeeList.svelte';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { userService } from '$lib/services/userService';

  // Check permissions on mount
  onMount(() => {
    // Redirect if user doesn't have permission to view employees
    if (!$currentUser || !hasPermission('user:read')) {
      goto('/dashboard');
      return;
    }

    // Load initial employee data
    userService.loadUsers({ reset: true });
  });
</script>

<svelte:head>
  <title>Employees - MountainHR</title>
  <meta name="description" content="View and manage all employees in your organization" />
</svelte:head>

<div class="employees-page">
  <EmployeeList />
</div>

<style lang="postcss">
  .employees-page {
    @apply w-full;
  }
</style>