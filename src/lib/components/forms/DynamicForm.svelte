<script lang="ts">
  import type { FormSchema, FormField } from '$lib/forms/types';
  import { 
    TextField, 
    TextAreaField,
    SelectField, 
    NumberField, 
    DateField,
    EmailField,
    PhoneField,
    RadioField, 
    CheckboxField, 
    FileField 
  } from './fields';
  import { Button } from '$lib/components/ui/button';
  
  export let schema: FormSchema;
  export let form: Record<string, any>;
  export let errors: Record<string, string[]>;
  export let constraints: Record<string, any>;
  export let submitting = false;
  export let showSubmitButton = true;
  export let submitText = 'Submit';
  export let cancelText = 'Cancel';
  export let onCancel: (() => void) | undefined = undefined;
  
  function getFieldComponent(fieldType: string) {
    const components = {
      'text': TextField,
      'textarea': TextAreaField,
      'email': EmailField,
      'phone': PhoneField,
      'number': NumberField,
      'date': DateField,
      'select': SelectField,
      'multi_select': SelectField,
      'radio': RadioField,
      'checkbox': CheckboxField,
      'file': FileField
    };
    
    return components[fieldType] || TextField;
  }
  
  function organizeFields(fields: FormField[]) {
    const sections: Record<string, FormField[]> = { default: [] };
    
    fields.forEach(field => {
      const section = field.ui_config?.section || 'default';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(field);
    });
    
    return sections;
  }
  
  function shouldShowField(field: FormField): boolean {
    if (!field.ui_config?.conditional_display) {
      return true;
    }
    
    const { depends_on, condition, value } = field.ui_config.conditional_display;
    const dependentValue = form[depends_on];
    
    switch (condition) {
      case 'equals':
        return dependentValue === value;
      case 'not_equals':
        return dependentValue !== value;
      case 'contains':
        return Array.isArray(dependentValue) ? 
               dependentValue.includes(value) : 
               String(dependentValue).includes(String(value));
      default:
        return true;
    }
  }
  
  $: fieldSections = organizeFields(schema.fields);
  $: layoutClass = schema.ui_config?.layout === 'three_column' ? 'grid-cols-1 lg:grid-cols-3' :
                   schema.ui_config?.layout === 'single_column' ? 'grid-cols-1' :
                   'grid-cols-1 md:grid-cols-2'; // default two_column
</script>

<div class="dynamic-form" class:show-progress={schema.ui_config?.show_progress}>
  {#if schema.ui_config?.show_progress}
    <div class="form-progress mb-6">
      <div class="progress-bar bg-gray-200 rounded-full h-2">
        <div class="progress-fill bg-primary h-2 rounded-full" style="width: 0%"></div>
      </div>
    </div>
  {/if}
  
  <div class="form-content space-y-8">
    {#each Object.entries(fieldSections) as [sectionName, sectionFields]}
      <div class="form-section" class:default-section={sectionName === 'default'}>
        {#if sectionName !== 'default'}
          <div class="section-header mb-6">
            <h3 class="section-title text-lg font-semibold text-gray-900 dark:text-gray-100">
              {sectionName}
            </h3>
          </div>
        {/if}
        
        <div class="section-fields grid gap-6 {layoutClass}">
          {#each sectionFields as field (field.id)}
            {#if field.type === 'section'}
              <div class="form-section-header col-span-full">
                <h4 class="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {field.label}
                </h4>
                {#if field.description}
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {field.description}
                  </p>
                {/if}
              </div>
            {:else if field.type === 'divider'}
              <hr class="form-divider col-span-full my-6 border-gray-200 dark:border-gray-700" />
            {:else if shouldShowField(field)}
              <div 
                class="form-field" 
                class:required={field.required}
                class:col-span-2={field.ui_config?.column_span === 2}
                class:col-span-3={field.ui_config?.column_span === 3}
                class:col-span-full={field.ui_config?.column_span === 'full'}
              >
                <svelte:component 
                  this={getFieldComponent(field.type)}
                  {field}
                  bind:value={form[field.name]}
                  errors={errors[field.name]}
                  constraints={constraints[field.name]}
                />
                
                {#if field.ui_config?.help_text}
                  <p class="field-help-text text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {field.ui_config.help_text}
                  </p>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
  
  {#if showSubmitButton}
    <div class="form-actions flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
      {#if onCancel}
        <Button
          type="button"
          variant="outline"
          onclick={onCancel}
          disabled={submitting}
        >
          {cancelText}
        </Button>
      {/if}
      
      <Button
        type="submit"
        disabled={submitting}
      >
        {#if submitting}
          <div class="flex items-center gap-2">
            <div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
            <span>Submitting...</span>
          </div>
        {:else}
          {submitText}
        {/if}
      </Button>
    </div>
  {/if}
</div>

<style>
  .dynamic-form {
    max-width: 100%;
    margin: 0 auto;
  }
  
  .form-field.required :global(label::after) {
    content: '*';
    color: rgb(239 68 68); /* red-500 */
    margin-left: 0.25rem;
  }
  
  .section-fields {
    transition: all 0.2s ease-in-out;
  }
  
  .form-field {
    transition: opacity 0.2s ease-in-out;
  }
  
  .progress-fill {
    transition: width 0.3s ease-in-out;
  }
  
  @media (max-width: 768px) {
    .section-fields {
      grid-template-columns: 1fr !important;
    }
    
    .col-span-2,
    .col-span-3,
    .col-span-full {
      grid-column: span 1;
    }
  }
</style>