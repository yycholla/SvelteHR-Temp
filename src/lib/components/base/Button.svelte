<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'ghost' = 'primary';
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let fullWidth: boolean = false;
  export let rounded: boolean = false;
  export let href: string | null = null;
  export let target: string | null = null;
  export let rel: string | null = null;
  export let leftIcon: string | null = null;
  export let rightIcon: string | null = null;
  export let iconOnly: boolean = false;

  // Class computation
  $: buttonClasses = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    rounded && 'btn--rounded',
    iconOnly && 'btn--icon-only',
    disabled && 'btn--disabled',
    loading && 'btn--loading'
  ].filter(Boolean).join(' ');

  // Event handlers
  function handleClick(event: MouseEvent) {
    if (disabled || loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Let the default click handler proceed
  }
</script>

{#if href && !disabled && !loading}
  <a 
    {href}
    {target}
    {rel}
    class={buttonClasses}
    role="button"
    on:click
    on:mouseenter
    on:mouseleave
    on:focus
    on:blur
  >
    {#if leftIcon && !iconOnly}
      <span class="btn__icon btn__icon--left">
        <i class="icon-{leftIcon}"></i>
      </span>
    {/if}

    {#if iconOnly}
      <span class="btn__icon">
        <i class="icon-{leftIcon || rightIcon}"></i>
      </span>
    {:else}
      <span class="btn__text">
        <slot />
      </span>
    {/if}

    {#if rightIcon && !iconOnly}
      <span class="btn__icon btn__icon--right">
        <i class="icon-{rightIcon}"></i>
      </span>
    {/if}

    {#if loading}
      <span class="btn__spinner">
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
      </span>
    {/if}
  </a>
{:else}
  <button
    {type}
    {disabled}
    class={buttonClasses}
    on:click={handleClick}
    on:mouseenter
    on:mouseleave
    on:focus
    on:blur
  >
    {#if leftIcon && !iconOnly}
      <span class="btn__icon btn__icon--left">
        <i class="icon-{leftIcon}"></i>
      </span>
    {/if}

    {#if iconOnly}
      <span class="btn__icon">
        <i class="icon-{leftIcon || rightIcon}"></i>
      </span>
    {:else}
      <span class="btn__text">
        <slot />
      </span>
    {/if}

    {#if rightIcon && !iconOnly}
      <span class="btn__icon btn__icon--right">
        <i class="icon-{rightIcon}"></i>
      </span>
    {/if}

    {#if loading}
      <span class="btn__spinner">
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
      </span>
    {/if}
  </button>
{/if}

<style lang="postcss">
  /* Base Button Styles */
  .btn {
    @apply inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out;
    @apply border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2;
    @apply disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none;
  }

  /* Size Variants */
  .btn--xs {
    @apply px-2.5 py-1.5 text-xs rounded;
  }

  .btn--sm {
    @apply px-3 py-2 text-sm rounded-md;
  }

  .btn--md {
    @apply px-4 py-2 text-sm rounded-md;
  }

  .btn--lg {
    @apply px-4 py-2 text-base rounded-md;
  }

  .btn--xl {
    @apply px-6 py-3 text-base rounded-md;
  }

  /* Color Variants */
  .btn--primary {
    @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
    @apply border-transparent shadow-sm;
  }

  .btn--secondary {
    @apply bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500;
    @apply border-transparent shadow-sm;
  }

  .btn--tertiary {
    @apply bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500;
    @apply border-gray-300 shadow-sm;
  }

  .btn--danger {
    @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
    @apply border-transparent shadow-sm;
  }

  .btn--success {
    @apply bg-green-600 text-white hover:bg-green-700 focus:ring-green-500;
    @apply border-transparent shadow-sm;
  }

  .btn--warning {
    @apply bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500;
    @apply border-transparent shadow-sm;
  }

  .btn--ghost {
    @apply bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-blue-500;
    @apply border-transparent;
  }

  /* Icon Styles */
  .btn__icon {
    @apply flex-shrink-0;
  }

  .btn__icon--left {
    @apply -ml-1 mr-2;
  }

  .btn__icon--right {
    @apply ml-2 -mr-1;
  }

  .btn__icon i {
    @apply w-4 h-4;
  }

  /* Icon-only buttons */
  .btn--icon-only {
    @apply p-2;
  }

  .btn--icon-only.btn--xs {
    @apply p-1;
  }

  .btn--icon-only.btn--sm {
    @apply p-1.5;
  }

  .btn--icon-only.btn--lg {
    @apply p-2.5;
  }

  .btn--icon-only.btn--xl {
    @apply p-3;
  }

  .btn--icon-only .btn__icon i {
    @apply w-4 h-4;
  }

  .btn--icon-only.btn--xs .btn__icon i {
    @apply w-3 h-3;
  }

  .btn--icon-only.btn--sm .btn__icon i {
    @apply w-3.5 h-3.5;
  }

  .btn--icon-only.btn--lg .btn__icon i {
    @apply w-5 h-5;
  }

  .btn--icon-only.btn--xl .btn__icon i {
    @apply w-6 h-6;
  }

  /* Text */
  .btn__text {
    @apply truncate;
  }

  /* Full Width */
  .btn--full-width {
    @apply w-full;
  }

  /* Rounded */
  .btn--rounded {
    @apply rounded-full;
  }

  /* Loading State */
  .btn--loading {
    @apply relative text-transparent;
  }

  .btn__spinner {
    @apply absolute inset-0 flex items-center justify-center;
  }

  .btn__spinner svg {
    @apply w-4 h-4;
  }

  .btn--xs .btn__spinner svg {
    @apply w-3 h-3;
  }

  .btn--sm .btn__spinner svg {
    @apply w-3.5 h-3.5;
  }

  .btn--lg .btn__spinner svg {
    @apply w-5 h-5;
  }

  .btn--xl .btn__spinner svg {
    @apply w-6 h-6;
  }

  /* Disabled State */
  .btn--disabled {
    @apply opacity-50 cursor-not-allowed pointer-events-none;
  }

  /* Hover Effects for Different Variants */
  .btn--primary:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-blue-700 shadow-md transform -translate-y-0.5;
  }

  .btn--secondary:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-gray-700 shadow-md transform -translate-y-0.5;
  }

  .btn--tertiary:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-gray-50 shadow-md transform -translate-y-0.5;
  }

  .btn--danger:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-red-700 shadow-md transform -translate-y-0.5;
  }

  .btn--success:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-green-700 shadow-md transform -translate-y-0.5;
  }

  .btn--warning:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-yellow-700 shadow-md transform -translate-y-0.5;
  }

  .btn--ghost:hover:not(.btn--disabled):not(.btn--loading) {
    @apply bg-gray-100 transform -translate-y-0.5;
  }

  /* Focus States */
  .btn:focus {
    @apply ring-2 ring-offset-2;
  }

  .btn--primary:focus {
    @apply ring-blue-500;
  }

  .btn--secondary:focus {
    @apply ring-gray-500;
  }

  .btn--tertiary:focus {
    @apply ring-blue-500;
  }

  .btn--danger:focus {
    @apply ring-red-500;
  }

  .btn--success:focus {
    @apply ring-green-500;
  }

  .btn--warning:focus {
    @apply ring-yellow-500;
  }

  .btn--ghost:focus {
    @apply ring-blue-500;
  }

  /* Animation for spinner */
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
</style>