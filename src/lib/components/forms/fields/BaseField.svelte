<script lang="ts">
  import type { FormField } from '$lib/forms/types';
  import { Label } from '$lib/components/ui/label';
  
  export let field: FormField;
  export let errors: string[] | undefined = undefined;
  export let constraints: any = undefined;
  export let value: any = undefined;
  
  $: hasError = errors && errors.length > 0;
  $: fieldId = field.id || field.name;
  $: helpTextId = `${fieldId}_help`;
  $: errorId = `${fieldId}_error`;
  
  // Determine ARIA attributes
  $: ariaDescribedBy = [
    field.description || field.ui_config?.help_text ? helpTextId : null,
    hasError ? errorId : null
  ].filter(Boolean).join(' ') || undefined;
</script>

<div class="field-container">
  <Label 
    for={fieldId}
    class="field-label"
    class:required={field.required}
    class:error={hasError}
  >
    {field.label}
  </Label>
  
  {#if field.description}
    <p id={helpTextId} class="field-description text-sm text-gray-600 dark:text-gray-400 mb-2">
      {field.description}
    </p>
  {/if}
  
  <div class="field-input">
    <slot 
      {fieldId}
      {ariaDescribedBy}
      {hasError}
      {constraints}
      required={field.required}
      placeholder={field.ui_config?.placeholder}
    />
  </div>
  
  {#if hasError}
    <div id={errorId} class="field-errors mt-1" role="alert">
      {#each errors as error}
        <p class="text-sm font-medium text-destructive">
          {error}
        </p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .field-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .field-label.required::after {
    content: '*';
    color: rgb(239 68 68); /* red-500 */
    margin-left: 0.25rem;
  }
  
  .field-label.error {
    color: rgb(239 68 68); /* red-500 */
  }
  
  .field-description {
    margin-top: -0.125rem;
    margin-bottom: 0.5rem;
  }
</style>