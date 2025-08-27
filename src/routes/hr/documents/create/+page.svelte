<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { createFormSchema } from '$lib/forms/builders/schema-builder';
  import { DynamicForm } from '$lib/components/forms';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { ArrowLeft, Upload } from 'lucide-svelte';
  
  export let data;
  
  let dynamicSchema: any = null;
  
  // Create superForm
  const { form, errors, constraints, enhance, submitting, message } = superForm(data.form, {
    validators: data.template ? zodClient(createFormSchema(data.template.template_schema)) : undefined,
    resetForm: false,
    invalidateAll: true,
    onResult: ({ result }) => {
      if (result.type === 'redirect') {
        console.log('✅ Document uploaded successfully');
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
    goto('/hr/documents');
  }
</script>

<div class="upload-document-page">
  <!-- Header -->
  <div class="page-header flex items-center gap-4 mb-8">
    <Button 
      variant="ghost" 
      size="sm"
      onclick={handleCancel}
      class="p-2"
    >
      <ArrowLeft class="w-4 h-4" />
      <span class="sr-only">Back to documents</span>
    </Button>
    
    <div class="flex items-center gap-3">
      <div class="p-2 bg-primary/10 rounded-lg">
        <Upload class="w-6 h-6 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Upload Document
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Upload and organize HR documents with proper metadata
        </p>
      </div>
    </div>
  </div>
  
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
      <form method="POST" use:enhance enctype="multipart/form-data">
        <DynamicForm
          schema={dynamicSchema}
          bind:form={$form}
          errors={$errors}
          constraints={$constraints}
          submitting={$submitting}
          submitText="Upload Document"
          cancelText="Cancel"
          onCancel={handleCancel}
        />
      </form>
    {:else}
      <!-- Fallback form if template failed to load -->
      <form method="POST" use:enhance class="space-y-6" enctype="multipart/form-data">
        <div class="space-y-6">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              bind:value={$form.title}
              required
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Enter document title"
            />
            {#if $errors.title}
              <p class="text-sm text-destructive mt-1">{$errors.title}</p>
            {/if}
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              bind:value={$form.description}
              rows="3"
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-vertical"
              placeholder="Enter document description (optional)"
            />
          </div>
          
          <div>
            <label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              id="category"
              name="category"
              bind:value={$form.category}
              required
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select category</option>
              <option value="HR Policies">HR Policies</option>
              <option value="Employee Handbook">Employee Handbook</option>
              <option value="Job Descriptions">Job Descriptions</option>
              <option value="Training Materials">Training Materials</option>
              <option value="Forms and Templates">Forms and Templates</option>
              <option value="Compliance Documents">Compliance Documents</option>
              <option value="Benefits Information">Benefits Information</option>
              <option value="Performance Reviews">Performance Reviews</option>
              <option value="Contracts">Contracts</option>
              <option value="Certificates">Certificates</option>
              <option value="Legal Documents">Legal Documents</option>
              <option value="Other">Other</option>
            </select>
            {#if $errors.category}
              <p class="text-sm text-destructive mt-1">{$errors.category}</p>
            {/if}
          </div>
          
          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              bind:checked={$form.is_public}
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label for="is_public" class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Make this document publicly accessible to all employees
            </label>
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
                <span>Uploading...</span>
              </div>
            {:else}
              Upload Document
            {/if}
          </Button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .upload-document-page {
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
    .upload-document-page {
      padding: 1rem;
    }
    
    .form-container {
      padding: 1.5rem;
    }
  }
</style>