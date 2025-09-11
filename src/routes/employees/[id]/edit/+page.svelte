<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import { userService } from '$lib/services/userService';
  import EmployeeForm from '$lib/components/employees/EmployeeForm.svelte';
  import Button from '$lib/components/base/Button.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import type { User } from '$lib/types';

  // Get employee ID from URL params
  $: employeeId = $page.params.id;

  let employee: User | null = null;
  let loading = false;
  let error: string | null = null;
  let formLoading = false;

  // Check if user can edit this employee
  $: canEdit = $currentUser && (
    $currentUser.id === employeeId || 
    hasPermission('user:update')
  );

  // Check permissions and load employee data
  onMount(async () => {
    if (!$currentUser) {
      goto('/login');
      return;
    }

    if (!canEdit) {
      goto(`/employees/${employeeId}`);
      return;
    }

    await loadEmployee();
  });

  async function loadEmployee() {
    try {
      loading = true;
      error = null;
      employee = await userService.getUserDetails(employeeId);
    } catch (err: any) {
      error = err.message;
      employee = null;
    } finally {
      loading = false;
    }
  }

  function handleSuccess(event: CustomEvent) {
    const { employee: updatedEmployee } = event.detail;
    console.log('Employee updated successfully:', updatedEmployee);
    
    // Redirect back to employee profile
    goto(`/employees/${updatedEmployee.id}`);
  }

  function handleError(event: CustomEvent) {
    error = event.detail.message;
    formLoading = false;
  }

  function handleCancel() {
    goto(`/employees/${employeeId}`);
  }

  function goBack() {
    goto(`/employees/${employeeId}`);
  }
</script>

<svelte:head>
  <title>Edit Employee - MountainHR</title>
  <meta name="description" content="Edit employee profile and information" />
</svelte:head>

<div class="edit-employee-page">
  <!-- Navigation Header -->
  <div class="page-nav">
    <Button
      variant="ghost"
      leftIcon="arrow-left"
      on:click={goBack}
    >
      Back to Profile
    </Button>
  </div>

  <div class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">
        {employee ? `Edit ${employee.displayName}` : 'Edit Employee'}
      </h1>
      <p class="page-header__subtitle">
        Update employee information and profile details.
      </p>
    </div>
  </div>

  {#if loading}
    <Card padding="lg">
      <div class="loading-state">
        <div class="loading-spinner">
          <svg class="animate-spin" viewBox="0 0 24 24">
            <circle 
              class="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              stroke-width="4" 
              fill="none"
            />
            <path 
              class="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p>Loading employee data...</p>
      </div>
    </Card>
  {:else if error}
    <Card padding="md" class="error-card">
      <div class="error-message">
        <div class="error-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Error Loading Employee</h3>
          <p class="error-description">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            on:click={loadEmployee}
          >
            Try Again
          </Button>
        </div>
      </div>
    </Card>
  {:else if employee}
    <div class="form-container">
      <EmployeeForm
        {employee}
        isEditing={true}
        loading={formLoading}
        on:success={handleSuccess}
        on:error={handleError}
        on:cancel={handleCancel}
      />
    </div>
  {/if}
</div>

<style lang="postcss">
  .edit-employee-page {
    @apply space-y-6 max-w-6xl mx-auto;
  }

  /* Page Navigation */
  .page-nav {
    @apply flex items-center;
  }

  /* Page Header */
  .page-header {
    @apply border-b border-gray-200 pb-6;
  }

  .page-header__content {
    @apply space-y-2;
  }

  .page-header__title {
    @apply text-3xl font-bold text-gray-900;
  }

  .page-header__subtitle {
    @apply text-lg text-gray-600;
  }

  /* Loading State */
  .loading-state {
    @apply flex flex-col items-center justify-center py-12 text-gray-500;
  }

  .loading-spinner svg {
    @apply w-8 h-8 mb-4;
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

  /* Form Container */
  .form-container {
    @apply space-y-6;
  }

  /* Animations */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .edit-employee-page {
      @apply max-w-none mx-4;
    }

    .page-header__title {
      @apply text-2xl;
    }

    .page-header__subtitle {
      @apply text-base;
    }
  }
</style>