<script lang="ts">
  import type { FormField } from '$lib/forms/types';
  import { Input } from '$lib/components/ui/input';
  import BaseField from './BaseField.svelte';
  
  export let field: FormField;
  export let value: number | string = '';
  export let errors: string[] | undefined = undefined;
  export let constraints: any = undefined;
  
  $: min = field.validation?.minValue;
  $: max = field.validation?.maxValue;
  $: step = field.ui_config?.variant === 'decimal' ? '0.01' : '1';
</script>

<BaseField {field} {errors} {constraints} {value} let:fieldId let:ariaDescribedBy let:hasError let:required let:placeholder>
  <Input
    id={fieldId}
    name={field.name}
    type="number"
    bind:value
    {required}
    {placeholder}
    {min}
    {max}
    {step}
    aria-describedby={ariaDescribedBy}
    aria-invalid={hasError ? 'true' : 'false'}
    class:border-destructive={hasError}
  />
</BaseField>