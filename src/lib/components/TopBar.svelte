<script lang="ts">
	import { Search, Bell, User, Settings, LogOut, Menu, Sun, Moon, X, Home, Users, Calendar, BarChart3 } from 'lucide-svelte';
	import Button from './ui/button/button.svelte';
	import ShadcnCommand from './ui/command/shadcn-command.svelte';
	import Avatar from './ui/avatar/avatar.svelte';
	import AvatarImage from './ui/avatar/avatar-image.svelte';
	import AvatarFallback from './ui/avatar/avatar-fallback.svelte';
	import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
	import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
	import Badge from './ui/badge/badge.svelte';
	import Separator from './ui/separator/separator.svelte';
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';

	const dispatch = createEventDispatcher();

	let {
		title = '',
		showSearch = true,
		showNavigation = false,
		currentPath = '/'
	} = $props();

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

	// Navigation items
	const navigationItems = [
		{ href: '/home', label: 'Home', icon: Home },
		{ href: '/employees', label: 'Employees', icon: Users },
		{ href: '/calendar', label: 'Calendar', icon: Calendar },
		{ href: '/hr', label: 'HR', icon: Users },
		{ href: '/admin', label: 'Admin', icon: Settings }
	];

	// State for responsive behavior
	let showMobileMenu = $state(false);
	let showActionsMenu = $state(false);
	let windowWidth = $state(1200); // Default to desktop size

	// Search bar positioning - reactive calculation
	// Start position: approximate search icon position within navbar
	const searchStartX = $derived(windowWidth - 24 - 150); // 24px from right edge, minus navbar width

	// Search positioning logic - improved to be more considerate
	const brandingEndX = windowWidth >= 884 ? 220 : 80; // Branding width with better spacing
	const navbarStartX = $derived(windowWidth - 24 - (windowWidth >= 1280 ? 420 : windowWidth >= 1024 ? 370 : windowWidth >= 884 ? 320 : 270));
	const availableSpace = $derived(navbarStartX - brandingEndX);
	const searchFitsHorizontally = $derived(availableSpace >= 400); // More conservative space check

	// Search positioning - better centered with more space consideration
	const searchTopPosition = $derived(searchFitsHorizontally ? 16 : 70);
	const searchEndX = $derived(searchFitsHorizontally ? Math.min(brandingEndX + (availableSpace / 2), windowWidth / 2) : windowWidth / 2);

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
			await auth.logout();
			// User will be redirected to login page automatically
		} catch (error) {
			console.error('Sign out error:', error);
		}
	}
</script>

{#if showNavigation}
	<!-- Responsive TopBar Container -->
	<div class="fixed top-4 left-6 right-6 z-50 flex items-center justify-between">
		<!-- Left: Branding (invisible placeholder to maintain spacing) -->
		<div class="{windowWidth >= 884 ? 'w-52' : 'w-16'} transition-all duration-300"></div>

		<!-- Center: Search placeholder (invisible endpoint) -->
		<div class="flex-1 flex justify-center mx-4">
			<!-- Placeholder for spacing -->
		</div>

		<!-- Right: Navigation and Actions -->
		<div class="flex items-center space-x-3 transition-all duration-300">

		<!-- Desktop Navigation (xl screens) -->
		<div class="hidden xl:flex h-12 items-center rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md px-2 shadow-xl">
			<!-- Search Icon -->
			<Button
				variant="ghost"
				size="icon"
				class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
				onclick={toggleSearch}
			>
				<div class="relative h-5 w-5 flex items-center justify-center">
					<Search class="h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}" />
					<X class="absolute h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}" />
				</div>
			</Button>
			<nav class="flex items-center space-x-1">
				{#each navigationItems as item}
					<a
						href={item.href}
						class="rounded-2xl px-5 py-2 text-base font-medium transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {isActive(item.href)
							? 'bg-background/90 text-foreground shadow-lg backdrop-blur-lg'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>

		<!-- Icon Navigation (lg screens) -->
		<div class="hidden lg:flex xl:hidden h-12 items-center rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md px-2 shadow-xl">
			<Button
				variant="ghost"
				size="icon"
				class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
				onclick={toggleSearch}
			>
				<div class="relative h-5 w-5 flex items-center justify-center">
					<Search class="h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}" />
					<X class="absolute h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}" />
				</div>
			</Button>
			<nav class="flex items-center space-x-1">
				{#each navigationItems as item}
					{@const IconComponent = item.icon}
					<a
						href={item.href}
						class="rounded-2xl p-2 transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {isActive(item.href)
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
		<div class="h-12 items-center rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md px-2 shadow-xl" style="display: {windowWidth >= 884 && windowWidth < 1024 ? 'flex' : 'none'}">
			<Button
				variant="ghost"
				size="icon"
				class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
				onclick={toggleSearch}
			>
				<div class="relative h-5 w-5 flex items-center justify-center">
					<Search class="h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}" />
					<X class="absolute h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}" />
				</div>
			</Button>
			<nav class="flex items-center space-x-1">
				{#each navigationItems as item}
					{@const IconComponent = item.icon}
					<a
						href={item.href}
						class="rounded-2xl p-2 transition-all duration-300 hover:scale-[1.02] hover:bg-background/30 {isActive(item.href)
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
					onclick={() => showActionsMenu = !showActionsMenu}
				>
					<Menu class="h-5 w-5" />
				</Button>

                {#if showActionsMenu}
					<div class="absolute top-8 right-0 bg-background/20 backdrop-blur-md border border-border/40 rounded-2xl shadow-xl p-2 min-w-40">
						<nav class="flex flex-col space-y-1">
                            <button
                                class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground"
                                onclick={() => { showActionsMenu = false; goto('/settings'); }}
                            >
								<Settings class="h-4 w-4" />
								<span class="text-sm font-medium">Settings</span>
							</button>
							<button
								class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground relative"
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
                                class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground"
                                onclick={() => { showActionsMenu = false; goto('/profile'); }}
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
		<div class="relative flex h-12 items-center rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md px-2 shadow-xl" style="display: {windowWidth < 884 ? 'flex' : 'none'}">
			<Button
				variant="ghost"
				size="icon"
				class="mr-1 h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
				onclick={toggleSearch}
			>
				<div class="relative h-5 w-5 flex items-center justify-center">
					<Search class="h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-0 rotate-90' : 'scale-100 rotate-0'}" />
					<X class="absolute h-5 w-5 transition-all duration-300 {searchExpanded ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}" />
				</div>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="h-7 w-7 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-background/30"
				onclick={() => showMobileMenu = !showMobileMenu}
			>
				<Menu class="h-5 w-5" />
			</Button>

			<!-- Mobile Menu Dropdown -->
			{#if showMobileMenu}
				<div class="absolute top-12 right-0 bg-background/20 backdrop-blur-md border border-border/40 rounded-2xl shadow-xl p-2 min-w-40">
					<nav class="flex flex-col space-y-1">
						{#each navigationItems as item}
							{@const IconComponent = item.icon}
							<a
								href={item.href}
								class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 {isActive(item.href)
									? 'bg-background/90 text-foreground shadow-lg'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => showMobileMenu = false}
							>
								<IconComponent class="h-4 w-4" />
								<span class="text-sm font-medium">{item.label}</span>
							</a>
						{/each}

						<!-- Divider -->
						<div class="h-px bg-border/40 my-2"></div>

						<!-- Action Items -->
						<button
							class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground"
							onclick={() => showMobileMenu = false}
						>
							<Settings class="h-4 w-4" />
							<span class="text-sm font-medium">Settings</span>
						</button>
						<button
							class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground relative"
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
							class="flex items-center space-x-3 rounded-2xl px-3 py-2 transition-all duration-300 hover:bg-background/30 text-muted-foreground hover:text-foreground"
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
        <div class="hidden lg:flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
            <a href="/settings" class="h-12 w-12 flex items-center justify-center">
                <Settings class="h-5 w-5" />
            </a>
        </div>

		<!-- Notifications Container (lg+ screens only) -->
        <div class="hidden lg:flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="relative h-7 w-7 rounded-full transition-all duration-300 hover:scale-[1.02] hover:bg-muted/60"
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
                    </Button>
                </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-80 max-h-96 overflow-y-auto bg-background/95 backdrop-blur-md border border-border/40 shadow-xl" align="end" sideOffset={8}>
					<div class="px-3 py-2 border-b border-border/40">
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
                    <DropdownMenuItem class="flex-col items-start p-3 h-auto focus:bg-muted/50 {notification.unread ? 'bg-accent/30' : ''}">
								<div class="w-full">
									<div class="flex items-start justify-between">
										<p class="text-sm font-medium">{notification.title}</p>
										{#if notification.unread}
											<div class="h-2 w-2 rounded-full bg-blue-500 mt-1"></div>
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
        <div class="hidden lg:flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 rounded-full transition-all duration-300 hover:scale-[1.02] hover:bg-muted/60"
                    >
                        <Avatar size="sm">
                            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                            <AvatarFallback class="bg-primary/10 font-semibold text-primary">JD</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-56 bg-background/95 backdrop-blur-md border border-border/40 shadow-xl" align="end" sideOffset={8}>
					<div class="px-3 py-2 border-b border-border/40">
						<div class="flex items-center space-x-3">
							<Avatar size="sm">
								<AvatarImage src="https://github.com/shadcn.png" alt="User" />
								<AvatarFallback class="bg-primary/10 font-semibold text-primary">JD</AvatarFallback>
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
				<div class="flex items-center space-x-4 min-w-0">
					<!-- Page Title -->
					{#if title}
						<h1
							class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent transition-all duration-300 truncate"
						>
							{title}
						</h1>
					{/if}
				</div>

				<!-- Center section: Placeholder for spacing -->
				<div class="flex-1 flex justify-center mx-4">
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
                        <DropdownMenuTrigger>
							<Button
								variant="ghost"
								size="icon"
								class="relative rounded-xl transition-all duration-200 hover:scale-105"
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
							</Button>
                        </DropdownMenuTrigger>
						<DropdownMenuContent class="w-80 max-h-96 overflow-y-auto bg-background/95 backdrop-blur-md border border-border/40 shadow-xl" align="end" sideOffset={8}>
							<div class="px-3 py-2 border-b border-border/40">
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
									<DropdownMenuItem class="flex-col items-start p-3 h-auto focus:bg-muted/50 {notification.unread ? 'bg-accent/30' : ''}">
										<div class="w-full">
											<div class="flex items-start justify-between">
												<p class="text-sm font-medium">{notification.title}</p>
												{#if notification.unread}
													<div class="h-2 w-2 rounded-full bg-blue-500 mt-1"></div>
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
                        <DropdownMenuTrigger>
							<Button
								variant="ghost"
								class="relative h-9 w-9 rounded-full transition-all duration-200 hover:scale-105"
							>
								<Avatar size="sm">
									<AvatarImage src="https://github.com/shadcn.png" alt="User" />
									<AvatarFallback class="bg-primary/10 font-semibold text-primary">JD</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
                        <DropdownMenuContent class="w-56 bg-background/95 backdrop-blur-md border border-border/40 shadow-xl" align="end" sideOffset={8}>
							<div class="px-3 py-2 border-b border-border/40">
								<div class="flex items-center space-x-3">
									<Avatar size="sm">
										<AvatarImage src="https://github.com/shadcn.png" alt="User" />
										<AvatarFallback class="bg-primary/10 font-semibold text-primary">JD</AvatarFallback>
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
	<DialogContent class="sm:max-w-[500px] p-6 bg-transparent border-0 shadow-none fixed top-20 left-1/2 transform -translate-x-1/2">
		<ShadcnCommand
			value={searchValue}
			placeholder="Type a command or search..."
			class="border-0 shadow-none bg-transparent"
			onValueChange={(v: string) => searchValue = v}
		/>
	</DialogContent>
</Dialog>
