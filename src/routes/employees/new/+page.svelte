<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import EmployeeForm from '$lib/components/employees/EmployeeForm.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import type { User } from '$lib/types';

  let loading = false;
  let error: string | null = null;

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser || !hasPermission('user:create')) {
      goto('/employees');
      return;
    }
  });

  function handleSuccess(event: CustomEvent) {
    const { employee } = event.detail;
    console.log('Employee created successfully:', employee);
    
    // Redirect to the new employee's profile
    goto(`/employees/${employee.id}`);
  }

  function handleError(event: CustomEvent) {
    error = event.detail.message;
    loading = false;
  }

  function handleCancel() {
    goto('/employees');
  }
</script>

<svelte:head>
  <title>Add New Employee - MountainHR</title>
  <meta name="description" content="Create a new employee profile" />
</svelte:head>

<div class="add-employee-page">
  <div class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">Add New Employee</h1>
      <p class="page-header__subtitle">
        Create a comprehensive employee profile with all necessary information.
      </p>
    </div>
  </div>

  {#if error}
    <Card padding="md" class="error-card">
      <div class="error-message">
        <div class="error-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Error Creating Employee</h3>
          <p class="error-description">{error}</p>
        </div>
      </div>
    </Card>
  {/if}

  <div class="form-container">
    <EmployeeForm
      isEditing={false}
      {loading}
      on:success={handleSuccess}
      on:error={handleError}
      on:cancel={handleCancel}
    />
  </div>
</div>

<style lang="postcss">
  .add-employee-page {
    @apply space-y-6 max-w-6xl mx-auto;
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
    @apply text-sm text-red-700;
  }

  /* Form Container */
  .form-container {
    @apply space-y-6;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .add-employee-page {
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