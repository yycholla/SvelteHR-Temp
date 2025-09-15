<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  /**
   * Authentication Layout Component
   * Provides consistent layout for auth pages (login, register, forgot password)
   */

  export let title = 'SvelteHR';
  export let subtitle = 'Human Resources Management System';
  export let showBranding = true;
  export let showFooter = true;

  // Dynamic background patterns
  let backgroundPattern = 'dots';
  
  onMount(() => {
    // Set different patterns based on route
    const pathname = $page.url.pathname;
    if (pathname.includes('login')) {
      backgroundPattern = 'dots';
    } else if (pathname.includes('register')) {
      backgroundPattern = 'grid';
    } else if (pathname.includes('forgot')) {
      backgroundPattern = 'waves';
    }
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={subtitle} />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
  <!-- Background Pattern -->
  <div class="absolute inset-0 bg-gray-50">
    {#if backgroundPattern === 'dots'}
      <div class="absolute inset-0 bg-dots-pattern opacity-5"></div>
    {:else if backgroundPattern === 'grid'}
      <div class="absolute inset-0 bg-grid-pattern opacity-5"></div>
    {:else if backgroundPattern === 'waves'}
      <div class="absolute inset-0 bg-waves-pattern opacity-5"></div>
    {/if}
  </div>

  <!-- Gradient Overlay -->
  <div class="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-100/50"></div>

  <!-- Main Content -->
  <div class="relative z-10">
    <!-- Header -->
    {#if showBranding}
      <div class="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <div class="text-center">
          <!-- Logo -->
          <div class="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          
          <!-- Brand Text -->
          <h2 class="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            {title}
          </h2>
          <p class="mt-2 text-sm text-gray-600 sm:text-base">
            {subtitle}
          </p>
        </div>
      </div>
    {/if}

    <!-- Auth Form Container -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
        <slot />
      </div>
    </div>

    <!-- Footer -->
    {#if showFooter}
      <div class="mt-8 text-center">
        <p class="text-xs text-gray-500">
          © {new Date().getFullYear()} SvelteHR. All rights reserved.
        </p>
        <div class="mt-2 flex justify-center space-x-4 text-xs text-gray-500">
          <a href="/privacy" class="hover:text-gray-700 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="/terms" class="hover:text-gray-700 transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="/support" class="hover:text-gray-700 transition-colors">Support</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Background patterns */
  .bg-dots-pattern {
    background-image: radial-gradient(circle, #374151 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .bg-grid-pattern {
    background-image: 
      linear-gradient(to right, #374151 1px, transparent 1px),
      linear-gradient(to bottom, #374151 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .bg-waves-pattern {
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23374151' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .bg-dots-pattern,
    .bg-grid-pattern {
      background-size: 15px 15px;
    }
  }

  /* Enhanced shadow for card */
  .shadow-xl {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Smooth transitions */
  a {
    transition: color 0.15s ease-in-out;
  }

  /* Focus styles for accessibility */
  a:focus {
    outline: 2px solid #3B82F6;
    outline-offset: 2px;
    border-radius: 2px;
  }
</style>