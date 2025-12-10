<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Bell,
		Building,
		ChevronDown,
		LogOut,
		Settings,
		Shield,
		User,
		UserCog
	} from '@lucide/svelte';

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
		goto('/dashboard/admin');
		isOpen = false;
	};

	const handleHRClick = () => {
		goto('/hr');
		isOpen = false;
	};

	const handleLogout = async () => {
		isOpen = false;
		// Pass current URL to logout for redirect after login
		await auth.logout($page.url.pathname + $page.url.search);
		dispatch('logout');
		goto('/login');
	};

	// Get user initials for avatar
	const getUserInitials = (name: string): string => {
		return name
			.split(' ')
			.map((part) => part.charAt(0))
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

{#if auth.user}
	<div class="relative" bind:this={menuElement}>
		<!-- Menu Trigger -->
		<button
			type="button"
			class="flex items-center rounded-full p-1 text-sm transition-all duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			on:click={() => (isOpen = !isOpen)}
			aria-expanded={isOpen}
			aria-haspopup="true"
		>
			<!-- User Avatar -->
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-sm font-medium text-white shadow-sm"
			>
				{getUserInitials(auth.user.displayName)}
			</div>

			<!-- User Info (hidden on mobile) -->
			<div class="ml-3 hidden text-left md:block">
				<p class="max-w-32 truncate text-sm font-medium text-gray-700">
					{auth.user.displayName}
				</p>
				<p class="max-w-32 truncate text-xs text-gray-500">
					{auth.user.job_title || auth.user.display_name || 'Employee'}
				</p>
			</div>

			<!-- Chevron -->
			<ChevronDown
				class="ml-2 hidden h-4 w-4 text-gray-400 transition-transform duration-150 ease-in-out md:block {isOpen
					? 'rotate-180'
					: ''}"
			/>
		</button>

		<!-- Dropdown Menu -->
		{#if isOpen}
			<div
				class="absolute right-0 z-50 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
				role="menu"
				aria-orientation="vertical"
			>
				<!-- User Info Header -->
				<div class="border-b border-gray-100 px-4 py-3">
					<div class="flex items-center">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 font-medium text-white shadow-sm"
						>
							{getUserInitials(auth.user.displayName)}
						</div>
						<div class="ml-3 min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-gray-900">
								{auth.user.displayName}
							</p>
							<p class="truncate text-sm text-gray-500">
								{auth.user.email}
							</p>
							{#if auth.user.job_title}
								<p class="truncate text-xs text-gray-400">
									{auth.user.job_title}
								</p>
							{/if}
						</div>
					</div>

					<!-- Role Badge -->
					{#if auth.user.role}
						<div class="mt-2 flex flex-wrap gap-1">
							<span
								class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {getRoleBadgeColor(
									auth.user.role
								)}"
							>
								{auth.user.role.replace('_', ' ').toUpperCase()}
							</span>
						</div>
					{/if}
				</div>

				<!-- Menu Items -->
				<div class="py-1" role="none">
					<!-- Profile -->
					<button
						type="button"
						class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
						role="menuitem"
						on:click={handleProfileClick}
					>
						<User class="mr-3 h-4 w-4 text-gray-400" />
						Your Profile
					</button>

					<!-- Settings -->
					<button
						type="button"
						class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
						role="menuitem"
						on:click={handleSettingsClick}
					>
						<Settings class="mr-3 h-4 w-4 text-gray-400" />
						Settings
					</button>

					<!-- HR Section (if has access) -->
					{#if auth.user.role && hasHRAccess([auth.user.role])}
						<div class="mt-1 border-t border-gray-100 pt-1">
							<button
								type="button"
								class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
								role="menuitem"
								on:click={handleHRClick}
							>
								<Building class="mr-3 h-4 w-4 text-gray-400" />
								HR Dashboard
							</button>
						</div>
					{/if}

					<!-- Admin Section (if has access) -->
					{#if auth.user.role && hasAdminAccess([auth.user.role])}
						<div class="mt-1 border-t border-gray-100 pt-1">
							<button
								type="button"
								class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
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
						class="flex w-full items-center px-4 py-2 text-left text-sm text-red-700 transition-colors duration-150 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
						role="menuitem"
						on:click={handleLogout}
						data-testid="logout-button"
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
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
