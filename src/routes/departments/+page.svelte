<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import DepartmentList from '$lib/components/departments/DepartmentList.svelte';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { departmentService } from '$lib/services/departmentService';

  // Check permissions on mount
  onMount(() => {
    // Redirect if user doesn't have permission to view departments
    if (!$currentUser || !hasPermission('department:read')) {
      goto('/dashboard');
      return;
    }

    // Load initial department data
    departmentService.loadDepartments({ reset: true });
  });
</script>

<svelte:head>
  <title>Departments - MountainHR</title>
  <meta name="description" content="View and manage all departments in your organization" />
</svelte:head>

<div class="departments-page">
  <DepartmentList />
</div>

<style lang="postcss">
  .departments-page {
    @apply w-full;
  }
</style>