<script lang="ts">
  import { Button } from 'carbon-components-svelte';

  // Carbon Button variants mapping
  export let variant: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'ghost' = 'primary';
  export let size: 'sm' | 'md' | 'lg' | 'xl' | 'field' = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let href: string | null = null;
  export let target: string | null = null;
  export let rel: string | null = null;
  export let icon: any = undefined;
  export let iconDescription: string = '';
  export let tooltipAlignment: 'start' | 'center' | 'end' = 'center';
  export let tooltipPosition: 'top' | 'right' | 'bottom' | 'left' = 'bottom';
  export let isSelected: boolean = false;
  export let hasIconOnly: boolean = false;
  export let iconOnly: boolean = false; // Legacy prop support
  export let expressive: boolean = false;
  export let skeleton: boolean = false;

  // Map custom variants to Carbon variants
  $: carbonKind = mapVariantToKind(variant);
  $: carbonSize = mapSizeToCarbon(size);

  function mapVariantToKind(variant: string): string {
    switch (variant) {
      case 'primary':
        return 'primary';
      case 'secondary':
        return 'secondary';
      case 'tertiary':
        return 'tertiary';
      case 'danger':
        return 'danger';
      case 'success':
        return 'primary'; // Carbon doesn't have success, use primary
      case 'warning':
        return 'secondary'; // Carbon doesn't have warning, use secondary
      case 'ghost':
        return 'ghost';
      default:
        return 'primary';
    }
  }

  function mapSizeToCarbon(size: string): string {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'md'; // Default Carbon size
      case 'lg':
        return 'lg';
      case 'xl':
        return 'xl';
      case 'field':
        return 'field';
      default:
        return 'md';
    }
  }

  // Handle iconOnly prop for backward compatibility
  $: hasIconOnlyComputed = hasIconOnly || iconOnly;
</script>

<Button
  kind={carbonKind}
  size={carbonSize}
  {type}
  {disabled}
  {href}
  {target}
  {rel}
  {icon}
  {iconDescription}
  {tooltipAlignment}
  {tooltipPosition}
  {isSelected}
  hasIconOnly={hasIconOnlyComputed}
  {expressive}
  {skeleton}
  on:click
  on:mouseenter
  on:mouseleave
  on:focus
  on:blur
  {...$$restProps}
>
  {#if loading}
    <span class="carbon-button-loading">
      <div class="carbon-spinner"></div>
    </span>
  {:else}
    <slot />
  {/if}
</Button>

<style>
  .carbon-button-loading {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .carbon-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>