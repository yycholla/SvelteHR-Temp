<script lang="ts">
	import {
		Search,
		Bell,
		User,
		Settings,
		LogOut,
		Menu,
		Sun,
		Moon,
		X,
		Home,
		Users,
		Calendar,
		BarChart3
	} from 'lucide-svelte';
	import Button from './ui/button/button.svelte';
	import ShadcnCommand from './ui/command/shadcn-command.svelte';
	import Avatar from './ui/avatar/avatar.svelte';
	import AvatarImage from './ui/avatar/avatar-image.svelte';
	import AvatarFallback from './ui/avatar/avatar-fallback.svelte';
	import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from './ui/dropdown-menu';
	import Badge from './ui/badge/badge.svelte';
	import Separator from './ui/separator/separator.svelte';
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		authActions,
		isAdmin,
		isHR,
		isManager,
		currentUser,
		canViewEmployees,
		canViewReports,
		canViewDepartments
	} from '$lib/stores/auth';
	import { AuthButton } from './auth';

	const dispatch = createEventDispatcher();

	let { title = '', showSearch = true, showNavigation = false, currentPath = '/' } = $props();

	let searchValue = $state('');
	let searchExpanded = $state(false);
	let commandModalOpen = $state(false);
	let notificationsOpen = $state(false);
	let userMenuOpen = $state(false);

	// Mock notifications
	const notifications = [
		{
			id: 1,
			title: 'New Employee Onboarding',
			message: 'Sarah Johnson has completed her first day',
			time: '2 min ago',
			unread: true,
			type: 'info'
		},
		{
			id: 2,
			title: 'Leave Request',
			message: 'Mike Davis submitted a vacation request',
			time: '1 hour ago',
			unread: true,
			type: 'warning'
		},
		{
			id: 3,
			title: 'Performance Review Due',
			message: '5 performance reviews are pending',
			time: '3 hours ago',
			unread: false,
			type: 'default'
		}
	];

	const unreadCount = notifications.filter((n) => n.unread).length;

	// Base navigation items available to all authenticated users
	const baseNavigationItems = [
		{ href: '/home', label: 'Home', icon: Home },
		{ href: '/calendar', label: 'Calendar', icon: Calendar }
	];

	// RBAC-based navigation items using permissions
	const roleBasedItems = [
		{
			href: '/employees',
			label: 'Employees',
			icon: Users,
			roles: [
				'HR',
				'HR Manager',
				'HR Admin',
				'Human Resources',
				'Admin',
				'Administrator',
				'Manager',
				'Department Manager'
			],
			permissions: ['employees.read', 'employees.*']
		},
		{
			href: '/departments',
			label: 'Departments',
			icon: Users,
			roles: [
				'HR',
				'HR Manager',
				'HR Admin',
				'Human Resources',
				'Admin',
				'Administrator',
				'Manager',
				'Department Manager'
			],
			permissions: ['departments.read', 'departments.*']
		},
		{
			href: '/hr',
			label: 'HR',
			icon: Users,
			roles: ['HR', 'HR Manager', 'HR Admin', 'Human Resources', 'Admin', 'Administrator']
		},
		{
			href: '/reports',
			label: 'Reports',
			icon: BarChart3,
			roles: [
				'HR',
				'HR Manager',
				'HR Admin',
				'Human Resources',
				'Admin',
				'Administrator',
				'Manager',
				'Department Manager'
			],
			permissions: ['reports.read', 'reports.*']
		},
		{
			href: '/admin',
			label: 'Admin',
			icon: Settings,
			roles: ['Admin', 'Administrator', 'System Admin'],
			permissions: ['system.admin', '*']
		}
	];

	// Filter navigation items based on user roles and permissions
	const navigationItems = $derived([
		...baseNavigationItems,
		...roleBasedItems.filter((item) => {
			if (!$currentUser) return false;

			const userRoles = $currentUser.roles?.map((r) => (typeof r === 'string' ? r : r.name)) || [];
			const userPermissions = $currentUser.permissions || [];

			// Check if user has required role (if specified)
			const hasRole = !item.roles || item.roles.some((role) => userRoles.includes(role));

			// Check if user has required permission (if specified)
			const hasPermission =
				!item.permissions ||
				item.permissions.some(
					(permission) =>
						userPermissions.includes(permission) ||
						userPermissions.includes(permission.split('.')[0] + '.*') ||
						userPermissions.includes('*')
				);

			// User needs either the role OR the permission (not both)
			// This allows for flexibility in the RBAC system
			return hasRole || hasPermission;
		})
	]);

	// State for responsive behavior
	let showMobileMenu = $state(false);
	let showActionsMenu = $state(false);
	let windowWidth = $state(1200); // Default to desktop size

	// Search bar positioning - reactive calculation
	// Start position: approximate search icon position within navbar
	const searchStartX = $derived(windowWidth - 24 - 150); // 24px from right edge, minus navbar width

	// Search positioning logic - improved to be more considerate
	const brandingEndX = windowWidth >= 884 ? 220 : 80; // Branding width with better spacing
	const navbarStartX = $derived(
		windowWidth -
			24 -
			(windowWidth >= 1280 ? 420 : windowWidth >= 1024 ? 370 : windowWidth >= 884 ? 320 : 270)
	);
	const availableSpace = $derived(navbarStartX - brandingEndX);
	const searchFitsHorizontally = $derived(availableSpace >= 400); // More conservative space check

	// Search positioning - better centered with more space consideration
	const searchTopPosition = $derived(searchFitsHorizontally ? 16 : 70);
	const searchEndX = $derived(
		searchFitsHorizontally
			? Math.min(brandingEndX + availableSpace / 2, windowWidth / 2)
			: windowWidth / 2
	);

	function isActive(href: string) {
		if (href === '/home') {
			return currentPath === '/home' || currentPath === '/';
		}
		return currentPath.startsWith(href);
	}

	function markAllRead() {
		notifications.forEach((n) => (n.unread = false));
	}

	function toggleSearch() {
		commandModalOpen = !commandModalOpen;
	}

	// Update window width for responsive calculations
	function updateWindowWidth() {
		windowWidth = window.innerWidth;
	}

	// Set up window resize listener
	if (typeof window !== 'undefined') {
		updateWindowWidth(); // Initialize
		window.addEventListener('resize', updateWindowWidth);
	}

	function handleSearch() {
		console.log('Searching for:', searchValue);
		// Handle search logic here
	}

	async function handleSignOut() {
		try {
			await authActions.logout();
			// User will be redirected to login page automatically
		} catch (error) {
			console.error('Sign out error:', error);
		}
	}
</script>

{#if showNavigation}
	<!-- Responsive TopBar Container -->
	<div class="fixed top-4 right-6 left-6 z-50 flex items-center justify-between">
		<!-- Left: Branding (invisible placeholder to maintain spacing) -->
		<div class="{windowWidth >= 884 ? 'w-52' : 'w-16'} transition-all duration-300"></div>

		<!-- Center: Search placeholder (invisible endpoint) -->
		<div class="mx-4 flex flex-1 justify-center">
			<!-- Placeholder for spacing -->
		</div>

		<!-- Right: Navigation and Actions -->
		<div class="flex items-center space-x-3 transition-all duration-300">
			<!-- Desktop Navigation (xl screens) -->
			<div
				class="hidden h-12 items-center rounded-2xl border border-border/40 bg-background/20 px-2 shadow-xl backdrop-blur-md xl:flex"
			>
				<!-- Search Icon -->
				<Button
					variant="ghost"
					size="icon"
					class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
					onclick={toggleSearch}
				>
					<div class="relative flex h-5 w-5 items-center justify-center">
						<Search
							class="h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-0 rotate-90'
								: 'scale-100 rotate-0'}"
						/>
						<X
							class="absolute h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-100 rotate-0'
								: 'scale-0 rotate-90'}"
						/>
					</div>
				</Button>
				<nav class="flex items-center space-x-1">
					{#each navigationItems as item}
						<a
							href={item.href}
							class="rounded-2xl px-5 py-2 text-base font-medium transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {isActive(
								item.href
							)
								? 'bg-background/90 text-foreground shadow-lg backdrop-blur-lg'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>

			<!-- Icon Navigation (lg screens) -->
			<div
				class="hidden h-12 items-center rounded-2xl border border-border/40 bg-background/20 px-2 shadow-xl backdrop-blur-md lg:flex xl:hidden"
			>
				<Button
					variant="ghost"
					size="icon"
					class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
					onclick={toggleSearch}
				>
					<div class="relative flex h-5 w-5 items-center justify-center">
						<Search
							class="h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-0 rotate-90'
								: 'scale-100 rotate-0'}"
						/>
						<X
							class="absolute h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-100 rotate-0'
								: 'scale-0 rotate-90'}"
						/>
					</div>
				</Button>
				<nav class="flex items-center space-x-1">
					{#each navigationItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.href}
							class="rounded-2xl p-2 transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {isActive(
								item.href
							)
								? 'bg-background/90 text-foreground shadow-lg backdrop-blur-lg'
								: 'text-muted-foreground hover:text-foreground'}"
							title={item.label}
						>
							<IconComponent class="h-5 w-5" />
						</a>
					{/each}
				</nav>
			</div>

			<!-- Icon Navigation with Actions Dropdown (884px to lg screens) -->
			<div
				class="h-12 items-center rounded-2xl border border-border/40 bg-background/20 px-2 shadow-xl backdrop-blur-md"
				style="display: {windowWidth >= 884 && windowWidth < 1024 ? 'flex' : 'none'}"
			>
				<Button
					variant="ghost"
					size="icon"
					class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
					onclick={toggleSearch}
				>
					<div class="relative flex h-5 w-5 items-center justify-center">
						<Search
							class="h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-0 rotate-90'
								: 'scale-100 rotate-0'}"
						/>
						<X
							class="absolute h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-100 rotate-0'
								: 'scale-0 rotate-90'}"
						/>
					</div>
				</Button>
				<nav class="flex items-center space-x-1">
					{#each navigationItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.href}
							class="rounded-2xl p-2 transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {isActive(
								item.href
							)
								? 'bg-background/90 text-foreground shadow-lg backdrop-blur-lg'
								: 'text-muted-foreground hover:text-foreground'}"
							title={item.label}
						>
							<IconComponent class="h-5 w-5" />
						</a>
					{/each}
				</nav>

				<!-- Actions Dropdown for md screens -->
				<div class="relative ml-1">
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
						onclick={() => (showActionsMenu = !showActionsMenu)}
					>
						<Menu class="h-5 w-5" />
					</Button>

					{#if showActionsMenu}
						<div
							class="absolute top-8 right-0 min-w-40 rounded-2xl border border-border/40 bg-background/20 p-2 shadow-xl backdrop-blur-md"
						>
							<nav class="flex flex-col space-y-1">
								<button
									class="flex items-center space-x-3 rounded-2xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:bg-background/30 hover:text-foreground"
									onclick={() => {
										showActionsMenu = false;
										goto('/settings');
									}}
								>
									<Settings class="h-4 w-4" />
									<span class="text-sm font-medium">Settings</span>
								</button>
								<button
									class="relative flex items-center space-x-3 rounded-2xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:bg-background/30 hover:text-foreground"
									onclick={() => {
										showActionsMenu = false;
										notificationsOpen = true;
									}}
								>
									<Bell class="h-4 w-4" />
									<span class="text-sm font-medium">Notifications</span>
									{#if unreadCount > 0}
										<Badge
											variant="destructive"
											class="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
										>
											{unreadCount}
										</Badge>
									{/if}
								</button>
								<button
									class="flex items-center space-x-3 rounded-2xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:bg-background/30 hover:text-foreground"
									onclick={() => {
										showActionsMenu = false;
										goto('/profile');
									}}
								>
									<User class="h-4 w-4" />
									<span class="text-sm font-medium">Profile</span>
								</button>
							</nav>
						</div>
					{/if}
				</div>
			</div>

			<!-- Hamburger Menu (884px and smaller screens) -->
			<div
				class="relative flex h-12 items-center rounded-2xl border border-border/40 bg-background/20 px-2 shadow-xl backdrop-blur-md"
				style="display: {windowWidth < 884 ? 'flex' : 'none'}"
			>
				<Button
					variant="ghost"
					size="icon"
					class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
					onclick={toggleSearch}
				>
					<div class="relative flex h-5 w-5 items-center justify-center">
						<Search
							class="h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-0 rotate-90'
								: 'scale-100 rotate-0'}"
						/>
						<X
							class="absolute h-5 w-5 transition-all duration-300 {searchExpanded
								? 'scale-100 rotate-0'
								: 'scale-0 rotate-90'}"
						/>
					</div>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
					onclick={() => (showMobileMenu = !showMobileMenu)}
				>
					<Menu class="h-5 w-5" />
				</Button>

				<!-- Mobile Menu Dropdown -->
				{#if showMobileMenu}
					<div
						class="absolute top-12 right-0 min-w-40 rounded-2xl border border-border/40 bg-background/20 p-2 shadow-xl backdrop-blur-md"
					>
						<nav class="flex flex-col space-y-1">
							{#each navigationItems as item}
								{@const IconComponent = item.icon}
								<a
									href={item.href}
									class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 {isActive(
										item.href
									)
										? 'bg-background/90 text-foreground shadow-lg'
										: 'text-muted-foreground hover:text-foreground'}"
									onclick={() => (showMobileMenu = false)}
								>
									<IconComponent class="h-4 w-4" />
									<span class="text-sm font-medium">{item.label}</span>
								</a>
							{/each}

							<!-- Divider -->
							<div class="my-2 h-px bg-border/40"></div>

							<!-- Action Items -->
							<button
								class="flex items-center space-x-3 rounded-2xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:bg-background/30 hover:text-foreground"
								onclick={() => (showMobileMenu = false)}
							>
								<Settings class="h-4 w-4" />
								<span class="text-sm font-medium">Settings</span>
							</button>
							<button
								class="relative flex items-center space-x-3 rounded-2xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:bg-background/30 hover:text-foreground"
								onclick={() => {
									showMobileMenu = false;
									notificationsOpen = true;
								}}
							>
								<Bell class="h-4 w-4" />
								<span class="text-sm font-medium">Notifications</span>
								{#if unreadCount > 0}
									<Badge
										variant="destructive"
										class="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
									>
										{unreadCount}
									</Badge>
								{/if}
							</button>
							<button
								class="flex items-center space-x-3 rounded-2xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:bg-background/30 hover:text-foreground"
								onclick={() => {
									showMobileMenu = false;
									userMenuOpen = true;
								}}
							>
								<User class="h-4 w-4" />
								<span class="text-sm font-medium">Profile</span>
							</button>
						</nav>
					</div>
				{/if}
			</div>

			<!-- Settings Container (lg+ screens only) -->
			<div
				class="hidden h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/20 shadow-xl backdrop-blur-md lg:flex"
			>
				<a href="/settings" class="flex h-12 w-12 items-center justify-center">
					<Settings class="h-5 w-5" />
				</a>
			</div>

			<!-- Notifications Container (lg+ screens only) -->
			<div
				class="hidden h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/20 shadow-xl backdrop-blur-md lg:flex"
			>
				<DropdownMenu>
					<DropdownMenuTrigger
						class="relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-[1.02] hover:bg-muted/60"
					>
						<Bell class="h-5 w-5" />
						{#if unreadCount > 0}
							<Badge
								variant="destructive"
								class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
							>
								{unreadCount}
							</Badge>
						{/if}
					</DropdownMenuTrigger>
					<DropdownMenuContent
						class="max-h-96 w-80 overflow-y-auto border border-border/40 bg-background/95 shadow-xl backdrop-blur-md"
						align="end"
						sideOffset={8}
					>
						<div class="border-b border-border/40 px-3 py-2">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-semibold">Notifications</h4>
								{#if unreadCount > 0}
									<Button variant="ghost" size="sm" class="h-6 text-xs" onclick={markAllRead}>
										Mark all read
									</Button>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground">
								You have {unreadCount} unread notifications
							</p>
						</div>

						<div class="max-h-64 overflow-y-auto">
							{#each notifications as notification (notification.id)}
								<DropdownMenuItem
									class="h-auto flex-col items-start p-3 focus:bg-muted/50 {notification.unread
										? 'bg-accent/30'
										: ''}"
								>
									<div class="w-full">
										<div class="flex items-start justify-between">
											<p class="text-sm font-medium">{notification.title}</p>
											{#if notification.unread}
												<div class="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
											{/if}
										</div>
										<p class="mt-1 text-sm text-muted-foreground">{notification.message}</p>
										<p class="mt-2 text-xs text-muted-foreground">{notification.time}</p>
									</div>
								</DropdownMenuItem>
								{#if notification !== notifications[notifications.length - 1]}
									<DropdownMenuSeparator />
								{/if}
							{/each}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<!-- User Menu Container (lg+ screens only) -->
			<div
				class="hidden h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/20 shadow-xl backdrop-blur-md lg:flex"
			>
				<DropdownMenu>
					<DropdownMenuTrigger
						class="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-[1.02] hover:bg-muted/60"
					>
						<Avatar size="sm">
							<AvatarImage src="https://github.com/shadcn.png" alt="User" />
							<AvatarFallback class="bg-primary/10 font-semibold text-primary">JD</AvatarFallback>
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						class="w-56 border border-border/40 bg-background/95 shadow-xl backdrop-blur-md"
						align="end"
						sideOffset={8}
					>
						<div class="border-b border-border/40 px-3 py-2">
							<div class="flex items-center space-x-3">
								<Avatar size="sm">
									<AvatarImage src="https://github.com/shadcn.png" alt="User" />
									<AvatarFallback class="bg-primary/10 font-semibold text-primary"
										>JD</AvatarFallback
									>
								</Avatar>
								<div>
									<p class="text-sm font-medium">John Doe</p>
									<p class="text-xs text-muted-foreground">HR Manager</p>
								</div>
							</div>
						</div>

						<div class="py-1">
							<DropdownMenuItem class="cursor-pointer" onclick={() => goto('/profile')}>
								<User class="mr-3 h-4 w-4" />
								Profile
							</DropdownMenuItem>
							<DropdownMenuItem class="cursor-pointer" onclick={() => goto('/settings')}>
								<Settings class="mr-3 h-4 w-4" />
								Settings
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								class="cursor-pointer text-destructive focus:text-destructive"
								onclick={handleSignOut}
							>
								<LogOut class="mr-3 h-4 w-4" />
								Sign out
							</DropdownMenuItem>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	</div>
{:else}
	<!-- Regular Top Bar with Sidebar Support -->
	<div class="relative z-50">
		<div class="mx-6 mt-4 mb-6">
			<div
				class="flex items-center justify-between rounded-2xl border border-border/50 bg-background/80 px-6 py-3 shadow-lg backdrop-blur-md"
			>
				<!-- Left section: Title -->
				<div class="flex min-w-0 items-center space-x-4">
					<!-- Page Title -->
					{#if title}
						<h1
							class="truncate bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent transition-all duration-300"
						>
							{title}
						</h1>
					{/if}
				</div>

				<!-- Center section: Placeholder for spacing -->
				<div class="mx-4 flex flex-1 justify-center">
					<!-- Placeholder for spacing -->
				</div>

				<!-- Right section: Actions -->
				<div class="flex items-center space-x-2 transition-all duration-300">
					<!-- Search Toggle -->
					<Button
						variant="ghost"
						size="icon"
						class="rounded-xl transition-all duration-200 hover:scale-105"
						onclick={toggleSearch}
					>
						<Search class="h-4 w-4" />
					</Button>

					<!-- Theme Toggle -->
					<Button
						variant="ghost"
						size="icon"
						class="rounded-xl transition-all duration-200 hover:scale-105"
					>
						<Sun class="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
						<Moon
							class="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
						/>
					</Button>

					<!-- Notifications -->
					<DropdownMenu>
						<DropdownMenuTrigger
							class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
						>
							<Bell class="h-4 w-4" />
							{#if unreadCount > 0}
								<Badge
									variant="destructive"
									class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
								>
									{unreadCount}
								</Badge>
							{/if}
						</DropdownMenuTrigger>
						<DropdownMenuContent
							class="max-h-96 w-80 overflow-y-auto border border-border/40 bg-background/95 shadow-xl backdrop-blur-md"
							align="end"
							sideOffset={8}
						>
							<div class="border-b border-border/40 px-3 py-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-semibold">Notifications</h4>
									{#if unreadCount > 0}
										<Button variant="ghost" size="sm" class="h-6 text-xs" onclick={markAllRead}>
											Mark all read
										</Button>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground">
									You have {unreadCount} unread notifications
								</p>
							</div>

							<div class="max-h-64 overflow-y-auto">
								{#each notifications as notification (notification.id)}
									<DropdownMenuItem
										class="h-auto flex-col items-start p-3 focus:bg-muted/50 {notification.unread
											? 'bg-accent/30'
											: ''}"
									>
										<div class="w-full">
											<div class="flex items-start justify-between">
												<p class="text-sm font-medium">{notification.title}</p>
												{#if notification.unread}
													<div class="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
												{/if}
											</div>
											<p class="mt-1 text-sm text-muted-foreground">{notification.message}</p>
											<p class="mt-2 text-xs text-muted-foreground">{notification.time}</p>
										</div>
									</DropdownMenuItem>
									{#if notification !== notifications[notifications.length - 1]}
										<DropdownMenuSeparator />
									{/if}
								{/each}
							</div>
						</DropdownMenuContent>
					</DropdownMenu>

					<!-- User Menu -->
					<DropdownMenu>
						<DropdownMenuTrigger
							class="relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-105"
						>
							<Avatar size="sm">
								<AvatarImage src="https://github.com/shadcn.png" alt="User" />
								<AvatarFallback class="bg-primary/10 font-semibold text-primary">JD</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							class="w-56 border border-border/40 bg-background/95 shadow-xl backdrop-blur-md"
							align="end"
							sideOffset={8}
						>
							<div class="border-b border-border/40 px-3 py-2">
								<div class="flex items-center space-x-3">
									<Avatar size="sm">
										<AvatarImage src="https://github.com/shadcn.png" alt="User" />
										<AvatarFallback class="bg-primary/10 font-semibold text-primary"
											>JD</AvatarFallback
										>
									</Avatar>
									<div>
										<p class="text-sm font-medium">John Doe</p>
										<p class="text-xs text-muted-foreground">HR Manager</p>
									</div>
								</div>
							</div>

							<div class="py-1">
								<DropdownMenuItem class="cursor-pointer">
									<User class="mr-3 h-4 w-4" />
									Profile
								</DropdownMenuItem>
								<DropdownMenuItem class="cursor-pointer">
									<Settings class="mr-3 h-4 w-4" />
									Settings
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									class="cursor-pointer text-destructive focus:text-destructive"
									onclick={handleSignOut}
								>
									<LogOut class="mr-3 h-4 w-4" />
									Sign out
								</DropdownMenuItem>
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Command Palette Modal -->
<Dialog>
	<DialogContent
		class="fixed top-20 left-1/2 -translate-x-1/2 transform border-0 bg-transparent p-6 shadow-none sm:max-w-[500px]"
	>
		<ShadcnCommand
			value={searchValue}
			placeholder="Type a command or search..."
			class="border-0 bg-transparent shadow-none"
			onValueChange={(v: string) => (searchValue = v)}
		/>
	</DialogContent>
</Dialog>
