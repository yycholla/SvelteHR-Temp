<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    Tile,
    ClickableTile,
    SkeletonPlaceholder,
    Button,
    Link
  } from 'carbon-components-svelte';
  import { ChevronRight, ArrowUp, ArrowDown } from 'carbon-icons-svelte';
  import type {
    CarbonDashboardTileProps,
    CarbonDashboardTileEvents
  } from '../../../contracts/component-interface';

  /**
   * Carbon Dashboard Tile Component
   * Displays key metrics and information in a Carbon Design System tile format
   * Supports trends, icons, loading states, and interactive behavior
   */

  type $$Props = CarbonDashboardTileProps;
  type $$Events = CarbonDashboardTileEvents;

  const dispatch = createEventDispatcher<CarbonDashboardTileEvents>();

  // Component props with defaults
  export let title: string;
  export let subtitle: string = '';
  export let value: string | number = '';
  export let trend: {
    direction: 'up' | 'down' | 'neutral';
    percentage?: number;
    description?: string;
  } | undefined = undefined;
  export let icon: any = undefined;
  export let color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'teal' = 'blue';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let interactive: boolean = false;
  export let loading: boolean = false;
  export let href: string = '';

  // Content slots
  export let content: string = '';
  export let footer: string = '';

  // Accessibility configuration
  export let accessibility = {
    tileLabel: 'Dashboard tile',
    announceChanges: true
  };

  // Event handlers
  export let onClick: (() => void) | undefined = undefined;
  export let onHover: (() => void) | undefined = undefined;

  // Enhanced event handlers
  function handleClick() {
    onClick?.();
    dispatch('click');
  }

  function handleHover() {
    onHover?.();
    dispatch('hover');
  }

  function handleFocus() {
    dispatch('focus');
  }

  // Accessibility helper for announcements
  function announceToScreenReader(message: string) {
    if (!accessibility.announceChanges) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Reactive size classes
  $: sizeClass = `carbon-tile--${size}`;
  $: colorClass = `carbon-tile--${color}`;

  // Format value for display
  function formatValue(val: string | number): string {
    if (typeof val === 'number') {
      // Format large numbers with commas
      if (val >= 1000) {
        return val.toLocaleString();
      }
      return val.toString();
    }
    return val;
  }

  // Get trend icon and styling
  function getTrendIcon() {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return ArrowUp;
      case 'down':
        return ArrowDown;
      default:
        return null;
    }
  }

  function getTrendClass() {
    if (!trend) return '';
    switch (trend.direction) {
      case 'up':
        return 'carbon-trend--positive';
      case 'down':
        return 'carbon-trend--negative';
      default:
        return 'carbon-trend--neutral';
    }
  }

  // Announce value changes for accessibility
  let previousValue = value;
  $: if (value !== previousValue && accessibility.announceChanges) {
    announceToScreenReader(`${title} updated to ${formatValue(value)}`);
    previousValue = value;
  }
</script>

<div
  class="carbon-dashboard-tile {sizeClass} {colorClass}"
  role="region"
  aria-label={accessibility.tileLabel}
  data-testid="carbon-dashboard-tile"
>
  {#if loading}
    <!-- Loading State -->
    <Tile>
      <div class="carbon-tile-skeleton">
        <SkeletonPlaceholder />
        <div class="carbon-skeleton-content">
          <SkeletonPlaceholder />
          <SkeletonPlaceholder />
        </div>
      </div>
    </Tile>
  {:else if interactive || href}
    <!-- Interactive Tile -->
    <ClickableTile
      href={href || undefined}
      on:click={handleClick}
      on:mouseenter={handleHover}
      on:focus={handleFocus}
    >
      <div class="carbon-tile-content">
        <!-- Header Section -->
        <div class="carbon-tile-header">
          {#if icon}
            <div class="carbon-tile-icon {colorClass}">
              <svelte:component this={icon} size={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 32} />
            </div>
          {/if}

          <div class="carbon-tile-titles">
            <h3 class="carbon-tile-title">{title}</h3>
            {#if subtitle}
              <p class="carbon-tile-subtitle">{subtitle}</p>
            {/if}
          </div>
        </div>

        <!-- Value Section -->
        {#if value}
          <div class="carbon-tile-value">
            <span class="carbon-value-text">{formatValue(value)}</span>
            {#if trend}
              <div class="carbon-trend {getTrendClass()}">
                {#if getTrendIcon()}
                  <svelte:component this={getTrendIcon()} size={16} />
                {/if}
                {#if trend.percentage !== undefined}
                  <span class="carbon-trend-percentage">{trend.percentage}%</span>
                {/if}
                {#if trend.description}
                  <span class="carbon-trend-description">{trend.description}</span>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Custom Content -->
        {#if content}
          <div class="carbon-tile-body">
            {@html content}
          </div>
        {/if}

        <!-- Footer Section -->
        {#if footer}
          <div class="carbon-tile-footer">
            {@html footer}
          </div>
        {/if}

        <!-- Interactive Indicator -->
        {#if interactive && !href}
          <div class="carbon-tile-indicator">
            <ChevronRight size={16} />
          </div>
        {/if}
      </div>
    </ClickableTile>
  {:else}
    <!-- Static Tile -->
    <Tile>
      <div class="carbon-tile-content">
        <!-- Header Section -->
        <div class="carbon-tile-header">
          {#if icon}
            <div class="carbon-tile-icon {colorClass}">
              <svelte:component this={icon} size={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 32} />
            </div>
          {/if}

          <div class="carbon-tile-titles">
            <h3 class="carbon-tile-title">{title}</h3>
            {#if subtitle}
              <p class="carbon-tile-subtitle">{subtitle}</p>
            {/if}
          </div>
        </div>

        <!-- Value Section -->
        {#if value}
          <div class="carbon-tile-value">
            <span class="carbon-value-text">{formatValue(value)}</span>
            {#if trend}
              <div class="carbon-trend {getTrendClass()}">
                {#if getTrendIcon()}
                  <svelte:component this={getTrendIcon()} size={16} />
                {/if}
                {#if trend.percentage !== undefined}
                  <span class="carbon-trend-percentage">{trend.percentage}%</span>
                {/if}
                {#if trend.description}
                  <span class="carbon-trend-description">{trend.description}</span>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Custom Content -->
        {#if content}
          <div class="carbon-tile-body">
            {@html content}
          </div>
        {/if}

        <!-- Footer Section -->
        {#if footer}
          <div class="carbon-tile-footer">
            {@html footer}
          </div>
        {/if}
      </div>
    </Tile>
  {/if}
</div>

<style>
  .carbon-dashboard-tile {
    width: 100%;
    position: relative;
    transition: all 150ms ease;
  }

  .carbon-tile-content {
    display: flex;
    flex-direction: column;
    gap: var(--cds-spacing-04);
    min-height: 100%;
  }

  /* Header Section */
  .carbon-tile-header {
    display: flex;
    align-items: flex-start;
    gap: var(--cds-spacing-04);
  }

  .carbon-tile-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--cds-spacing-08);
    height: var(--cds-spacing-08);
    border-radius: var(--cds-border-radius);
    background: var(--cds-layer-accent-01);
  }

  .carbon-tile-icon.carbon-tile--blue {
    background: var(--cds-support-info);
    color: var(--cds-text-on-color);
  }

  .carbon-tile-icon.carbon-tile--green {
    background: var(--cds-support-success);
    color: var(--cds-text-on-color);
  }

  .carbon-tile-icon.carbon-tile--red {
    background: var(--cds-support-error);
    color: var(--cds-text-on-color);
  }

  .carbon-tile-icon.carbon-tile--yellow {
    background: var(--cds-support-warning);
    color: var(--cds-text-on-color);
  }

  .carbon-tile-icon.carbon-tile--purple {
    background: var(--cds-purple-60);
    color: var(--cds-text-on-color);
  }

  .carbon-tile-icon.carbon-tile--teal {
    background: var(--cds-teal-60);
    color: var(--cds-text-on-color);
  }

  .carbon-tile-titles {
    flex: 1;
    min-width: 0;
  }

  .carbon-tile-title {
    font-size: var(--cds-productive-heading-03-font-size);
    font-weight: var(--cds-productive-heading-03-font-weight);
    line-height: var(--cds-productive-heading-03-line-height);
    color: var(--cds-text-primary);
    margin: 0 0 var(--cds-spacing-02) 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .carbon-tile-subtitle {
    font-size: var(--cds-body-short-01-font-size);
    line-height: var(--cds-body-short-01-line-height);
    color: var(--cds-text-secondary);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Value Section */
  .carbon-tile-value {
    display: flex;
    align-items: baseline;
    gap: var(--cds-spacing-03);
    flex-wrap: wrap;
  }

  .carbon-value-text {
    font-size: var(--cds-productive-heading-05-font-size);
    font-weight: var(--cds-productive-heading-05-font-weight);
    line-height: var(--cds-productive-heading-05-line-height);
    color: var(--cds-text-primary);
  }

  /* Trend Indicators */
  .carbon-trend {
    display: flex;
    align-items: center;
    gap: var(--cds-spacing-02);
    font-size: var(--cds-body-short-01-font-size);
    line-height: var(--cds-body-short-01-line-height);
  }

  .carbon-trend--positive {
    color: var(--cds-support-success);
  }

  .carbon-trend--negative {
    color: var(--cds-support-error);
  }

  .carbon-trend--neutral {
    color: var(--cds-text-secondary);
  }

  .carbon-trend-percentage {
    font-weight: var(--cds-font-weight-semibold);
  }

  .carbon-trend-description {
    color: var(--cds-text-secondary);
  }

  /* Body and Footer */
  .carbon-tile-body {
    flex: 1;
    font-size: var(--cds-body-short-01-font-size);
    line-height: var(--cds-body-short-01-line-height);
    color: var(--cds-text-primary);
  }

  .carbon-tile-footer {
    font-size: var(--cds-helper-text-01-font-size);
    line-height: var(--cds-helper-text-01-line-height);
    color: var(--cds-text-secondary);
    border-top: 1px solid var(--cds-border-subtle-01);
    padding-top: var(--cds-spacing-03);
    margin-top: auto;
  }

  /* Interactive Indicator */
  .carbon-tile-indicator {
    position: absolute;
    top: var(--cds-spacing-04);
    right: var(--cds-spacing-04);
    color: var(--cds-icon-secondary);
    transition: color 150ms ease;
  }

  /* Size Variants */
  .carbon-tile--sm .carbon-tile-content {
    gap: var(--cds-spacing-03);
  }

  .carbon-tile--sm .carbon-tile-title {
    font-size: var(--cds-productive-heading-02-font-size);
    font-weight: var(--cds-productive-heading-02-font-weight);
    line-height: var(--cds-productive-heading-02-line-height);
  }

  .carbon-tile--sm .carbon-value-text {
    font-size: var(--cds-productive-heading-04-font-size);
    font-weight: var(--cds-productive-heading-04-font-weight);
    line-height: var(--cds-productive-heading-04-line-height);
  }

  .carbon-tile--lg .carbon-tile-content {
    gap: var(--cds-spacing-05);
  }

  .carbon-tile--lg .carbon-tile-title {
    font-size: var(--cds-productive-heading-04-font-size);
    font-weight: var(--cds-productive-heading-04-font-weight);
    line-height: var(--cds-productive-heading-04-line-height);
  }

  .carbon-tile--lg .carbon-value-text {
    font-size: var(--cds-productive-heading-06-font-size);
    font-weight: var(--cds-productive-heading-06-font-weight);
    line-height: var(--cds-productive-heading-06-line-height);
  }

  .carbon-tile--xl .carbon-tile-content {
    gap: var(--cds-spacing-06);
  }

  .carbon-tile--xl .carbon-tile-title {
    font-size: var(--cds-productive-heading-05-font-size);
    font-weight: var(--cds-productive-heading-05-font-weight);
    line-height: var(--cds-productive-heading-05-line-height);
  }

  .carbon-tile--xl .carbon-value-text {
    font-size: var(--cds-productive-heading-07-font-size);
    font-weight: var(--cds-productive-heading-07-font-weight);
    line-height: var(--cds-productive-heading-07-line-height);
  }

  /* Loading State */
  .carbon-tile-skeleton {
    display: flex;
    align-items: flex-start;
    gap: var(--cds-spacing-04);
  }

  .carbon-skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--cds-spacing-03);
  }

  /* Interactive States */
  :global(.bx--tile--clickable:hover) .carbon-tile-indicator {
    color: var(--cds-icon-primary);
  }

  :global(.bx--tile--clickable:focus) {
    outline: 2px solid var(--cds-focus);
    outline-offset: 2px;
  }

  /* Screen reader only content */
  :global(.sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .carbon-tile-icon {
      border: 2px solid var(--cds-border-strong);
    }

    .carbon-trend--positive {
      border-left: 2px solid var(--cds-support-success);
      padding-left: var(--cds-spacing-02);
    }

    .carbon-trend--negative {
      border-left: 2px solid var(--cds-support-error);
      padding-left: var(--cds-spacing-02);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .carbon-dashboard-tile,
    .carbon-tile-indicator {
      transition: none;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .carbon-tile--lg,
    .carbon-tile--xl {
      /* Reduce size on small screens */
    }

    .carbon-tile--lg .carbon-value-text,
    .carbon-tile--xl .carbon-value-text {
      font-size: var(--cds-productive-heading-05-font-size);
    }
  }
</style>