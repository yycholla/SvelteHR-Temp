<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import RoleManagement from '$lib/components/admin/RoleManagement.svelte';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { permissionsService } from '$lib/services/permissionsService';
  import Button from '$lib/components/base/Button.svelte';
  import Card from '$lib/components/base/Card.svelte';

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser) {
      goto('/login');
      return;
    }

    // Double-check admin permissions
    if (!permissionsService.isSuperAdmin($currentUser) && !hasPermission('system', 'configure')) {
      goto('/dashboard');
      return;
    }
  });
</script>

<svelte:head>
  <title>Role Management - Admin - MountainHR</title>
  <meta name="description" content="Manage user roles and permissions" />
</svelte:head>

<div class="roles-admin-page">
  <div class="page-header">
    <div class="header-content">
      <div class="title-section">
        <h1 class="page-title">Role Management</h1>
        <p class="page-description">
          Manage user roles and permissions across the MountainHR system
        </p>
      </div>
      <div class="header-actions">
        <Button
          variant="secondary"
          leftIcon="arrow-left"
          on:click={() => goto('/dashboard/admin')}
        >
          Back to Admin
        </Button>
      </div>
    </div>
  </div>

  <div class="page-content">
    <Card padding="none" class="role-management-container">
      <RoleManagement />
    </Card>
  </div>
</div>

<style lang="postcss">
  .roles-admin-page {
    @apply space-y-6;
  }

  .page-header {
    @apply bg-white rounded-lg shadow-sm border p-6;
  }

  .header-content {
    @apply flex items-start justify-between;
  }

  .title-section {
    @apply space-y-1;
  }

  .page-title {
    @apply text-2xl font-bold text-gray-900;
  }

  .page-description {
    @apply text-gray-600;
  }

  .header-actions {
    @apply flex-shrink-0;
  }

  .page-content {
    @apply space-y-6;
  }

  .role-management-container {
    @apply overflow-hidden;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .header-content {
      @apply flex-col space-y-4 items-start;
    }

    .header-actions {
      @apply self-stretch;
    }
  }
</style>