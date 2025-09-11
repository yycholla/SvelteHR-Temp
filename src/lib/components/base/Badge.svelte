<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'light' | 'dark' = 'primary';
  export let size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
  export let rounded: boolean = true;
  export let outline: boolean = false;
  export let dot: boolean = false;
  export let removable: boolean = false;

  // Computed classes
  $: badgeClasses = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    rounded && 'badge--rounded',
    outline && 'badge--outline',
    dot && 'badge--dot',
    removable && 'badge--removable'
  ].filter(Boolean).join(' ');

  function handleRemove() {
    if (removable) {
      const event = new CustomEvent('remove');
      document.dispatchEvent(event);
    }
  }
</script>

<span class={badgeClasses}>
  {#if dot}
    <span class="badge__dot"></span>
  {/if}
  
  <span class="badge__content">
    <slot />
  </span>

  {#if removable}
    <button
      type="button"
      class="badge__remove"
      on:click={handleRemove}
    >
      <span class="sr-only">Remove</span>
      <svg class="badge__remove-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  {/if}
</span>

<style lang="postcss">
  /* Base Badge Styles */
  .badge {
    @apply inline-flex items-center font-medium;
  }

  /* Size Variants */
  .badge--xs {
    @apply px-1.5 py-0.5 text-xs;
  }

  .badge--sm {
    @apply px-2 py-1 text-xs;
  }

  .badge--md {
    @apply px-2.5 py-1.5 text-sm;
  }

  .badge--lg {
    @apply px-3 py-2 text-sm;
  }

  /* Color Variants - Solid */
  .badge--primary {
    @apply bg-blue-100 text-blue-800;
  }

  .badge--secondary {
    @apply bg-gray-100 text-gray-800;
  }

  .badge--success {
    @apply bg-green-100 text-green-800;
  }

  .badge--warning {
    @apply bg-yellow-100 text-yellow-800;
  }

  .badge--danger {
    @apply bg-red-100 text-red-800;
  }

  .badge--info {
    @apply bg-cyan-100 text-cyan-800;
  }

  .badge--light {
    @apply bg-white text-gray-800 border border-gray-200;
  }

  .badge--dark {
    @apply bg-gray-800 text-white;
  }

  /* Outline Variants */
  .badge--outline.badge--primary {
    @apply bg-transparent text-blue-700 border border-blue-300;
  }

  .badge--outline.badge--secondary {
    @apply bg-transparent text-gray-700 border border-gray-300;
  }

  .badge--outline.badge--success {
    @apply bg-transparent text-green-700 border border-green-300;
  }

  .badge--outline.badge--warning {
    @apply bg-transparent text-yellow-700 border border-yellow-300;
  }

  .badge--outline.badge--danger {
    @apply bg-transparent text-red-700 border border-red-300;
  }

  .badge--outline.badge--info {
    @apply bg-transparent text-cyan-700 border border-cyan-300;
  }

  .badge--outline.badge--light {
    @apply bg-transparent text-gray-700 border border-gray-300;
  }

  .badge--outline.badge--dark {
    @apply bg-transparent text-gray-900 border border-gray-900;
  }

  /* Rounded */
  .badge--rounded {
    @apply rounded-full;
  }

  .badge:not(.badge--rounded) {
    @apply rounded-md;
  }

  /* Dot Style */
  .badge--dot {
    @apply px-2;
  }

  .badge__dot {
    @apply w-2 h-2 rounded-full mr-1.5;
  }

  /* Dot colors */
  .badge--primary .badge__dot {
    @apply bg-blue-600;
  }

  .badge--secondary .badge__dot {
    @apply bg-gray-600;
  }

  .badge--success .badge__dot {
    @apply bg-green-600;
  }

  .badge--warning .badge__dot {
    @apply bg-yellow-600;
  }

  .badge--danger .badge__dot {
    @apply bg-red-600;
  }

  .badge--info .badge__dot {
    @apply bg-cyan-600;
  }

  .badge--light .badge__dot {
    @apply bg-gray-400;
  }

  .badge--dark .badge__dot {
    @apply bg-white;
  }

  /* Outline dot colors */
  .badge--outline.badge--primary .badge__dot {
    @apply bg-blue-600;
  }

  .badge--outline.badge--secondary .badge__dot {
    @apply bg-gray-600;
  }

  .badge--outline.badge--success .badge__dot {
    @apply bg-green-600;
  }

  .badge--outline.badge--warning .badge__dot {
    @apply bg-yellow-600;
  }

  .badge--outline.badge--danger .badge__dot {
    @apply bg-red-600;
  }

  .badge--outline.badge--info .badge__dot {
    @apply bg-cyan-600;
  }

  .badge--outline.badge--light .badge__dot {
    @apply bg-gray-600;
  }

  .badge--outline.badge--dark .badge__dot {
    @apply bg-gray-900;
  }

  /* Content */
  .badge__content {
    @apply truncate;
  }

  /* Remove Button */
  .badge--removable {
    @apply pr-1;
  }

  .badge__remove {
    @apply ml-1 flex-shrink-0 h-4 w-4 rounded-full inline-flex items-center justify-center;
    @apply hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-1 focus:ring-offset-1;
  }

  .badge__remove-icon {
    @apply h-3 w-3;
  }

  /* Remove button focus colors */
  .badge--primary .badge__remove:focus {
    @apply ring-blue-600;
  }

  .badge--secondary .badge__remove:focus {
    @apply ring-gray-600;
  }

  .badge--success .badge__remove:focus {
    @apply ring-green-600;
  }

  .badge--warning .badge__remove:focus {
    @apply ring-yellow-600;
  }

  .badge--danger .badge__remove:focus {
    @apply ring-red-600;
  }

  .badge--info .badge__remove:focus {
    @apply ring-cyan-600;
  }

  .badge--light .badge__remove:focus {
    @apply ring-gray-600;
  }

  .badge--dark .badge__remove:focus {
    @apply ring-white;
  }

  /* Screen reader only */
  .sr-only {
    @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
    clip: rect(0, 0, 0, 0);
  }
</style>