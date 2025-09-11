<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import EmployeeProfile from '$lib/components/employees/EmployeeProfile.svelte';
  import Button from '$lib/components/base/Button.svelte';
  import Card from '$lib/components/base/Card.svelte';

  // Get employee ID from URL params
  $: employeeId = $page.params.id;

  let error: string | null = null;

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser || !hasPermission('user:read')) {
      goto('/dashboard');
      return;
    }
  });

  function handleEdit(event: CustomEvent) {
    const { employee } = event.detail;
    goto(`/employees/${employee.id}/edit`);
  }

  function handleDeactivated(event: CustomEvent) {
    const { employee } = event.detail;
    console.log('Employee deactivated:', employee);
    // Could show a success message or refresh data
  }

  function goBack() {
    goto('/employees');
  }
</script>

<svelte:head>
  <title>Employee Profile - MountainHR</title>
  <meta name="description" content="View employee profile and details" />
</svelte:head>

<div class="employee-profile-page">
  <!-- Navigation Header -->
  <div class="page-nav">
    <Button
      variant="ghost"
      leftIcon="arrow-left"
      on:click={goBack}
    >
      Back to Employees
    </Button>
  </div>

  {#if error}
    <Card padding="md" class="error-card">
      <div class="error-message">
        <div class="error-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Error Loading Profile</h3>
          <p class="error-description">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            on:click={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    </Card>
  {/if}

  <!-- Employee Profile Component -->
  <div class="profile-container">
    <EmployeeProfile
      {employeeId}
      showActions={true}
      on:edit={handleEdit}
      on:deactivated={handleDeactivated}
    />
  </div>
</div>

<style lang="postcss">
  .employee-profile-page {
    @apply space-y-6 max-w-7xl mx-auto;
  }

  /* Page Navigation */
  .page-nav {
    @apply flex items-center;
  }

  /* Error Card */
  .error-card {
    @apply border-l-4 border-red-500 bg-red-50;
  }

  .error-message {
    @apply flex items-start space-x-3;
  }

  .error-icon {
    @apply flex-shrink-0 text-red-500;
  }

  .error-icon i {
    @apply w-5 h-5;
  }

  .error-content {
    @apply flex-1;
  }

  .error-title {
    @apply text-sm font-medium text-red-900 mb-1;
  }

  .error-description {
    @apply text-sm text-red-700 mb-3;
  }

  /* Profile Container */
  .profile-container {
    @apply space-y-6;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .employee-profile-page {
      @apply max-w-none mx-4;
    }
  }
</style>