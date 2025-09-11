<script lang="ts">
  export let padding: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'sm';
  export let rounded: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  export let border: boolean = true;
  export let hoverable: boolean = false;
  export let clickable: boolean = false;

  // Computed classes
  $: cardClasses = [
    'card',
    `card--padding-${padding}`,
    `card--shadow-${shadow}`,
    `card--rounded-${rounded}`,
    border && 'card--border',
    hoverable && 'card--hoverable',
    clickable && 'card--clickable'
  ].filter(Boolean).join(' ');

  // Handle click if clickable
  function handleClick(event: MouseEvent) {
    if (clickable) {
      // Dispatch a custom click event
      const detail = { originalEvent: event };
      const clickEvent = new CustomEvent('cardClick', { detail });
      event.currentTarget?.dispatchEvent(clickEvent);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const detail = { originalEvent: event };
      const clickEvent = new CustomEvent('cardClick', { detail });
      event.currentTarget?.dispatchEvent(clickEvent);
    }
  }
</script>

{#if clickable}
  <div 
    class={cardClasses}
    role="button"
    tabindex="0"
    on:click={handleClick}
    on:keydown={handleKeydown}
    on:cardClick
  >
    <slot />
  </div>
{:else}
  <div 
    class={cardClasses}
    on:cardClick
  >
    <slot />
  </div>
{/if}

<style lang="postcss">
  /* Base Card Styles */
  .card {
    @apply bg-white;
  }

  /* Padding Variants */
  .card--padding-none {
    @apply p-0;
  }

  .card--padding-sm {
    @apply p-3;
  }

  .card--padding-md {
    @apply p-4;
  }

  .card--padding-lg {
    @apply p-6;
  }

  .card--padding-xl {
    @apply p-8;
  }

  /* Shadow Variants */
  .card--shadow-none {
    @apply shadow-none;
  }

  .card--shadow-sm {
    @apply shadow-sm;
  }

  .card--shadow-md {
    @apply shadow-md;
  }

  .card--shadow-lg {
    @apply shadow-lg;
  }

  .card--shadow-xl {
    @apply shadow-xl;
  }

  /* Rounded Variants */
  .card--rounded-none {
    @apply rounded-none;
  }

  .card--rounded-sm {
    @apply rounded-sm;
  }

  .card--rounded-md {
    @apply rounded-md;
  }

  .card--rounded-lg {
    @apply rounded-lg;
  }

  .card--rounded-xl {
    @apply rounded-xl;
  }

  .card--rounded-full {
    @apply rounded-full;
  }

  /* Border */
  .card--border {
    @apply border border-gray-200;
  }

  /* Hoverable */
  .card--hoverable {
    @apply transition-shadow duration-200 ease-in-out;
  }

  .card--hoverable:hover {
    @apply shadow-md;
  }

  .card--hoverable.card--shadow-sm:hover {
    @apply shadow-lg;
  }

  .card--hoverable.card--shadow-md:hover {
    @apply shadow-lg;
  }

  .card--hoverable.card--shadow-lg:hover {
    @apply shadow-xl;
  }

  .card--hoverable.card--shadow-xl:hover {
    @apply shadow-2xl;
  }

  /* Clickable */
  .card--clickable {
    @apply cursor-pointer transition-all duration-200 ease-in-out;
    @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  }

  .card--clickable:hover {
    @apply transform -translate-y-0.5 shadow-lg;
  }

  .card--clickable.card--shadow-sm:hover {
    @apply shadow-lg;
  }

  .card--clickable.card--shadow-md:hover {
    @apply shadow-xl;
  }

  .card--clickable.card--shadow-lg:hover {
    @apply shadow-xl;
  }

  .card--clickable.card--shadow-xl:hover {
    @apply shadow-2xl;
  }

  .card--clickable:active {
    @apply transform translate-y-0 shadow-md;
  }

  /* Focus states for clickable cards */
  .card--clickable:focus {
    @apply ring-2 ring-blue-500 ring-offset-2;
  }
</style>