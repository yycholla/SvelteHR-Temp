<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import DepartmentHierarchy from '$lib/components/departments/DepartmentHierarchy.svelte';
  import Button from '$lib/components/base/Button.svelte';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { departmentService } from '$lib/services/departmentService';

  // Check permissions on mount
  onMount(() => {
    // Redirect if user doesn't have permission to view departments
    if (!$currentUser || !hasPermission('department:read')) {
      goto('/dashboard');
      return;
    }

    // Load hierarchy data
    departmentService.loadDepartmentHierarchy();
  });
</script>

<svelte:head>
  <title>Department Hierarchy - MountainHR</title>
  <meta name="description" content="View your organization's department hierarchy and structure" />
</svelte:head>

<div class="hierarchy-page">
  <div class="hierarchy-page__header">
    <div class="breadcrumb">
      <Button
        variant="ghost"
        size="sm"
        leftIcon="arrow-left"
        on:click={() => goto('/departments')}
      >
        Back to Departments
      </Button>
    </div>
  </div>

  <DepartmentHierarchy />
</div>

<style lang="postcss">
  .hierarchy-page {
    @apply w-full space-y-6;
  }

  .hierarchy-page__header {
    @apply flex items-center justify-between;
  }

  .breadcrumb {
    @apply flex items-center space-x-2;
  }
</style>