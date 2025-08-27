<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { createFormSchema } from '$lib/forms/builders/schema-builder';
  import { DynamicForm } from '$lib/components/forms';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Calendar } from 'lucide-svelte';
  
  export let data;
  
  let dynamicSchema: any = null;
  
  // Create superForm
  const { form, errors, constraints, enhance, submitting, message } = superForm(data.form, {
    validators: data.template ? zodClient(createFormSchema(data.template.template_schema)) : undefined,
    resetForm: false,
    invalidateAll: true,
    onResult: ({ result }) => {
      if (result.type === 'redirect') {
        console.log('✅ Leave request created successfully');
      }
    },
    onError: ({ result }) => {
      console.error('❌ Form submission failed:', result);
    }
  });
  
  // Set up dynamic schema after template loads
  $: if (data.template) {
    dynamicSchema = data.template.template_schema;
  }
  
  function handleCancel() {
    goto('/hr/leave');
  }
  
  // Calculate leave duration
  $: leaveDuration = calculateLeaveDuration($form.startDate, $form.endDate);
  
  function calculateLeaveDuration(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return 'Invalid date range';
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
    
    if (diffDays === 1) {
      return '1 day';
    } else {
      return `${diffDays} days`;
    }
  }
</script>

<div class="create-leave-request-page">
  <!-- Header -->
  <div class="page-header flex items-center gap-4 mb-8">
    <Button 
      variant="ghost" 
      size="sm"
      onclick={handleCancel}
      class="p-2"
    >
      <ArrowLeft class="w-4 h-4" />
      <span class="sr-only">Back to leave requests</span>
    </Button>
    
    <div class="flex items-center gap-3">
      <div class="p-2 bg-primary/10 rounded-lg">
        <Calendar class="w-6 h-6 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Request Time Off
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Submit a new leave request for approval
        </p>
      </div>
    </div>
  </div>
  
  <!-- Leave Duration Calculator -->
  {#if $form.startDate && $form.endDate && leaveDuration}
    <div class="duration-display mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div class="flex items-center gap-2 text-blue-800 dark:text-blue-200">
        <Calendar class="w-4 h-4" />
        <span class="font-medium">Leave Duration: {leaveDuration}</span>
      </div>
    </div>
  {/if}
  
  <!-- Error Message -->
  {#if data.error}
    <div class="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
      <p>{data.error}</p>
    </div>
  {/if}
  
  {#if $message}
    <div class="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
      <p>{$message}</p>
    </div>
  {/if}
  
  <!-- Form -->
  <div class="form-container bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8">
    {#if dynamicSchema}
      <form method="POST" use:enhance>
        <DynamicForm
          schema={dynamicSchema}
          bind:form={$form}
          errors={$errors}
          constraints={$constraints}
          submitting={$submitting}
          submitText="Submit Leave Request"
          cancelText="Cancel"
          onCancel={handleCancel}
        />
      </form>
    {:else}
      <!-- Fallback form if template failed to load -->
      <form method="POST" use:enhance class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="leaveType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Leave Type *
            </label>
            <select
              id="leaveType"
              name="leaveType"
              bind:value={$form.leaveType}
              required
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select leave type</option>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal Leave</option>
              <option value="other">Other</option>
            </select>
            {#if $errors.leaveType}
              <p class="text-sm text-destructive mt-1">{$errors.leaveType}</p>
            {/if}
          </div>
          
          <div>
            <label for="startDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              bind:value={$form.startDate}
              required
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {#if $errors.startDate}
              <p class="text-sm text-destructive mt-1">{$errors.startDate}</p>
            {/if}
          </div>
          
          <div>
            <label for="endDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              bind:value={$form.endDate}
              required
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {#if $errors.endDate}
              <p class="text-sm text-destructive mt-1">{$errors.endDate}</p>
            {/if}
          </div>
          
          <div class="md:col-span-2">
            <label for="reason" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason *
            </label>
            <textarea
              id="reason"
              name="reason"
              bind:value={$form.reason}
              required
              rows="4"
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
              placeholder="Please provide a reason for your leave request..."
            />
            {#if $errors.reason}
              <p class="text-sm text-destructive mt-1">{$errors.reason}</p>
            {/if}
          </div>
        </div>
        
        <div class="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onclick={handleCancel}
            disabled={$submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={$submitting}
          >
            {#if $submitting}
              <div class="flex items-center gap-2">
                <div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                <span>Submitting...</span>
              </div>
            {:else}
              Submit Leave Request
            {/if}
          </Button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .create-leave-request-page {
    max-width: 4xl;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .form-container {
    background: white;
  }
  
  @media (prefers-color-scheme: dark) {
    .form-container {
      background: rgb(31 41 55); /* gray-800 */
    }
  }
  
  @media (max-width: 768px) {
    .create-leave-request-page {
      padding: 1rem;
    }
    
    .form-container {
      padding: 1.5rem;
    }
  }
</style>