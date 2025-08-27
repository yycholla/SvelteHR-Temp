<script lang="ts">
  import type { FormField } from '$lib/forms/types';
  import BaseField from './BaseField.svelte';
  
  export let field: FormField;
  export let value: string[] = [];
  export let errors: string[] | undefined = undefined;
  export let constraints: any = undefined;
  
  $: options = field.options || [];
  $: isInline = field.ui_config?.variant === 'inline';
  
  function handleChange(optionValue: string, checked: boolean) {
    if (checked) {
      if (!value.includes(optionValue)) {
        value = [...value, optionValue];
      }
    } else {
      value = value.filter(v => v !== optionValue);
    }
  }
</script>

<BaseField {field} {errors} {constraints} {value} let:fieldId let:ariaDescribedBy let:hasError let:required>
  <fieldset 
    aria-describedby={ariaDescribedBy}
    aria-invalid={hasError ? 'true' : 'false'}
    class="checkbox-group"
    class:inline={isInline}
  >
    <legend class="sr-only">{field.label}</legend>
    
    <div class="checkbox-options" class:flex-row={isInline} class:flex-col={!isInline}>
      {#each options as option, index}
        <div class="checkbox-option">
          <input
            type="checkbox"
            id="{fieldId}_{index}"
            name="{field.name}[]"
            value={option.value}
            checked={value.includes(option.value)}
            on:change={(e) => handleChange(option.value, e.currentTarget.checked)}
            class="checkbox-input w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2 dark:border-gray-600"
          />
          <label 
            for="{fieldId}_{index}" 
            class="checkbox-label ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {option.label}
            {#if option.description}
              <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </span>
            {/if}
          </label>
        </div>
      {/each}
    </div>
    
    <!-- Hidden input to ensure empty arrays are submitted -->
    <input type="hidden" name={field.name} value="" />
  </fieldset>
</BaseField>

<style>
  .checkbox-group {
    border: none;
    padding: 0;
    margin: 0;
  }
  
  .checkbox-options {
    display: flex;
    gap: 1rem;
  }
  
  .checkbox-options.flex-col {
    flex-direction: column;
  }
  
  .checkbox-options.flex-row {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .checkbox-option {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .checkbox-input {
    margin-top: 0.125rem; /* Align with first line of label text */
  }
  
  .checkbox-label {
    cursor: pointer;
    line-height: 1.4;
  }
  
  @media (max-width: 640px) {
    .checkbox-options.flex-row {
      flex-direction: column;
    }
  }
</style>