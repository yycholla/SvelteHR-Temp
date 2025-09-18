<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, hasPermission } from '$lib/stores/auth';
  import ShadcnLayout from '$lib/components/layout/ShadcnLayout.svelte';
  import EmployeeForm from '$lib/components/employees/EmployeeFormShadcn.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, AlertCircle, UserPlus } from 'lucide-svelte';
  import type { User } from '$lib/types';

  let loading = $state(false);
  let error: string | null = $state(null);

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser || !hasPermission('create_users')) {
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

  function goBack() {
    goto('/employees');
  }
</script>

<svelte:head>
  <title>Add New Employee - SvelteHR</title>
  <meta name="description" content="Create a new employee profile" />
</svelte:head>

<ShadcnLayout>
  <div class="space-y-6">
    <!-- Header with back button -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onclick={goBack}>
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserPlus class="h-8 w-8" />
            Add New Employee
          </h1>
          <p class="text-muted-foreground">
            Create a comprehensive employee profile with all necessary information
          </p>
        </div>
      </div>
    </div>

    {#if error}
      <Card.Root>
        <Card.Content class="py-6">
          <div class="flex items-start space-x-4">
            <AlertCircle class="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div class="flex-1">
              <h3 class="text-lg font-semibold">Error Creating Employee</h3>
              <p class="text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <EmployeeForm
      isEditing={false}
      {loading}
      onsuccess={handleSuccess}
      onerror={handleError}
      oncancel={handleCancel}
    />
  </div>
</ShadcnLayout>

