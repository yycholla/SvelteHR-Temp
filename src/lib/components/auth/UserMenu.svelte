<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { currentUser, authStore } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { 
    User, 
    Settings, 
    LogOut, 
    ChevronDown, 
    Bell,
    Shield,
    UserCog,
    Building
  } from 'lucide-svelte';

  /**
   * User Menu Component
   * Displays user info and provides logout/profile access
   */

  const dispatch = createEventDispatcher<{
    logout: void;
    profileClick: void;
    settingsClick: void;
  }>();

  let isOpen = false;
  let menuElement: HTMLDivElement;

  // Handle outside clicks
  const handleOutsideClick = (event: MouseEvent) => {
    if (menuElement && !menuElement.contains(event.target as Node)) {
      isOpen = false;
    }
  };

  onMount(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  });

  // Menu actions
  const handleProfileClick = () => {
    dispatch('profileClick');
    goto('/profile');
    isOpen = false;
  };

  const handleSettingsClick = () => {
    dispatch('settingsClick');
    goto('/settings');
    isOpen = false;
  };

  const handleAdminClick = () => {
    goto('/admin');
    isOpen = false;
  };

  const handleHRClick = () => {
    goto('/hr');
    isOpen = false;
  };

  const handleLogout = async () => {
    isOpen = false;
    await authStore.logout();
    dispatch('logout');
    goto('/login');
  };

  // Get user initials for avatar
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'hr_admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'finance':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if user has admin privileges
  const hasAdminAccess = (roles: string[]): boolean => {
    return roles.includes('admin') || roles.includes('hr_admin');
  };

  // Check if user has HR access
  const hasHRAccess = (roles: string[]): boolean => {
    return roles.includes('admin') || roles.includes('hr_admin') || roles.includes('manager');
  };
</script>

{#if $currentUser}
  <div class="relative" bind:this={menuElement}>
    <!-- Menu Trigger -->
    <button
      type="button"
      class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ease-in-out hover:bg-gray-50 p-1"
      on:click={() => isOpen = !isOpen}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <!-- User Avatar -->
      <div class="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium shadow-sm">
        {getUserInitials($currentUser.displayName)}
      </div>
      
      <!-- User Info (hidden on mobile) -->
      <div class="hidden md:block ml-3 text-left">
        <p class="text-sm font-medium text-gray-700 truncate max-w-32">
          {$currentUser.displayName}
        </p>
        <p class="text-xs text-gray-500 truncate max-w-32">
          {$currentUser.jobTitle || 'Employee'}
        </p>
      </div>
      
      <!-- Chevron -->
      <ChevronDown 
        class="hidden md:block ml-2 h-4 w-4 text-gray-400 transition-transform duration-150 ease-in-out {isOpen ? 'rotate-180' : ''}"
      />
    </button>

    <!-- Dropdown Menu -->
    {#if isOpen}
      <div class="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
           role="menu" 
           aria-orientation="vertical">
        
        <!-- User Info Header -->
        <div class="px-4 py-3 border-b border-gray-100">
          <div class="flex items-center">
            <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
              {getUserInitials($currentUser.displayName)}
            </div>
            <div class="ml-3 flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {$currentUser.displayName}
              </p>
              <p class="text-sm text-gray-500 truncate">
                {$currentUser.email}
              </p>
              {#if $currentUser.jobTitle}
                <p class="text-xs text-gray-400 truncate">
                  {$currentUser.jobTitle}
                </p>
              {/if}
            </div>
          </div>
          
          <!-- Role Badges -->
          {#if $currentUser.roles && $currentUser.roles.length > 0}
            <div class="mt-2 flex flex-wrap gap-1">
              {#each $currentUser.roles as role}
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getRoleBadgeColor(role)}">
                  {role.replace('_', ' ').toUpperCase()}
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Menu Items -->
        <div class="py-1" role="none">
          
          <!-- Profile -->
          <button
            type="button"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center transition-colors duration-150"
            role="menuitem"
            on:click={handleProfileClick}
          >
            <User class="mr-3 h-4 w-4 text-gray-400" />
            Your Profile
          </button>

          <!-- Settings -->
          <button
            type="button"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center transition-colors duration-150"
            role="menuitem"
            on:click={handleSettingsClick}
          >
            <Settings class="mr-3 h-4 w-4 text-gray-400" />
            Settings
          </button>

          <!-- HR Section (if has access) -->
          {#if hasHRAccess($currentUser.roles)}
            <div class="border-t border-gray-100 mt-1 pt-1">
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center transition-colors duration-150"
                role="menuitem"
                on:click={handleHRClick}
              >
                <Building class="mr-3 h-4 w-4 text-gray-400" />
                HR Dashboard
              </button>
            </div>
          {/if}

          <!-- Admin Section (if has access) -->
          {#if hasAdminAccess($currentUser.roles)}
            <div class="border-t border-gray-100 mt-1 pt-1">
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center transition-colors duration-150"
                role="menuitem"
                on:click={handleAdminClick}
              >
                <Shield class="mr-3 h-4 w-4 text-gray-400" />
                Admin Panel
              </button>
            </div>
          {/if}
        </div>

        <!-- Logout Section -->
        <div class="border-t border-gray-100">
          <button
            type="button"
            class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 focus:bg-red-50 focus:outline-none flex items-center transition-colors duration-150"
            role="menuitem"
            on:click={handleLogout}
          >
            <LogOut class="mr-3 h-4 w-4 text-red-400" />
            Sign out
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Enhanced dropdown shadow */
  .shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* Smooth transitions */
  button {
    transition: all 0.15s ease-in-out;
  }

  /* Focus ring styles */
  button:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  /* Role badge animations */
  span {
    transition: all 0.15s ease-in-out;
  }

  /* Hover effects for better UX */
  button:hover .text-gray-400 {
    color: #6b7280;
  }
</style>