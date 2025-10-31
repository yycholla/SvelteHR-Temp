<!--
  Carbon Navigation Shell Component

  Application navigation shell with breadcrumbs, user context, and accessibility features.
  Provides consistent navigation patterns across the HR application.
-->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		HeaderNavMenu,
		HeaderPanelDivider,
		HeaderAction,
		HeaderPanelLinks,
		HeaderPanelLink,
		HeaderUtilities,
		HeaderGlobalAction,
		HeaderSearch,
		SideNav,
		SideNavItems,
		SideNavLink,
		SideNavMenu,
		SideNavMenuItem,
		SkipToContent,
		Breadcrumb,
		BreadcrumbItem,
		Button,
		OverflowMenu,
		OverflowMenuItem,
		NotificationButton,
		TooltipIcon
	} from 'carbon-components-svelte';
	import {
		Search,
		Notification,
		UserAvatar,
		Settings,
		Help,
		Logout,
		Menu,
		Close,
		ChevronRight,
		Home
	} from 'carbon-icons-svelte';
	import type {
		CarbonNavigationShellContract,
		UserContext,
		NavigationItem,
		BreadcrumbItem as InterfaceBreadcrumbItem,
		UserAction,
		NotificationItem,
		SkipLink,
		KeyboardShortcut,
		ARIALandmark
	} from '../../../contracts/component-interface';
	import { getSpacing, getColor, getCurrentBreakpoint } from '$lib/utils/design-tokens';

	// Props using runes syntax
	let {
		user,
		primaryNavigation = [],
		breadcrumbs = [],
		userActions = [],
		notifications = [],
		searchEnabled = true,
		accessibility = {
			skipToContent: { label: 'Skip to main content', target: '#main-content' },
			keyboardShortcuts: [
				{ key: 'Alt+1', description: 'Go to main navigation' },
				{ key: 'Alt+2', description: 'Go to main content' },
				{ key: 'Alt+S', description: 'Focus search' }
			],
			landmarks: [
				{ role: 'banner', label: 'Site header' },
				{ role: 'navigation', label: 'Main navigation' },
				{ role: 'main', label: 'Main content' }
			]
		},
		onNavigate = undefined,
		onUserAction = undefined,
		onSearch = undefined,
		onNotificationDismiss = undefined,
		children
	}: {
		user: UserContext;
		primaryNavigation?: NavigationItem[];
		breadcrumbs?: InterfaceBreadcrumbItem[];
		userActions?: UserAction[];
		notifications?: NotificationItem[];
		searchEnabled?: boolean;
		accessibility?: {
			skipToContent: SkipLink;
			keyboardShortcuts: KeyboardShortcut[];
			landmarks: ARIALandmark[];
		};
		onNavigate?: ((item: NavigationItem) => void) | undefined;
		onUserAction?: ((action: UserAction) => void) | undefined;
		onSearch?: ((query: string) => void) | undefined;
		onNotificationDismiss?: ((notification: NotificationItem) => void) | undefined;
		children?: Snippet;
	} = $props();

	// Ensure primaryNavigation is always an array
	let safePrimaryNavigation = $derived(() => {
		return primaryNavigation && Array.isArray(primaryNavigation) ? primaryNavigation : [];
	});

	// Internal state
	let isSideNavOpen = $state(false);
	let isUserMenuOpen = $state(false);
	let isNotificationPanelOpen = $state(false);
	let searchQuery = $state('');
	let searchInputRef = $state<HTMLInputElement>();
	let currentBreakpoint = $state('large');

	const dispatch = createEventDispatcher();

	// Reactive statements
	let unreadNotifications = $derived(() => notifications.filter((n) => !n.read).length);
	let visibleNavItems = $derived(() =>
		safePrimaryNavigation.filter(
			(item) => !item.permissions || item.permissions.some((p) => user.permissions.includes(p))
		)
	);

	// Functions
	function handleNavigate(item: NavigationItem) {
		if (item.href) {
			// Close mobile nav after navigation
			if (currentBreakpoint === 'small' || currentBreakpoint === 'medium') {
				isSideNavOpen = false;
			}
		}

		onNavigate?.(item);
		dispatch('navigate', { item });
	}

	function handleUserAction(action: UserAction) {
		isUserMenuOpen = false;
		onUserAction?.(action);
		dispatch('userAction', { action });
	}

	function handleSearch() {
		if (searchQuery.trim()) {
			onSearch?.(searchQuery.trim());
			dispatch('search', { query: searchQuery.trim() });
		}
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSearch();
		}
		if (event.key === 'Escape') {
			searchQuery = '';
			searchInputRef?.blur();
		}
	}

	function handleNotificationDismiss(notification: NotificationItem) {
		onNotificationDismiss?.(notification);
		dispatch('notificationDismiss', { notification });
	}

	function handleKeyboardShortcuts(event: KeyboardEvent) {
		// Handle global keyboard shortcuts
		if (event.altKey) {
			switch (event.key) {
				case '1':
					event.preventDefault();
					focusMainNavigation();
					break;
				case '2':
					event.preventDefault();
					focusMainContent();
					break;
				case 's':
				case 'S':
					event.preventDefault();
					focusSearch();
					break;
			}
		}

		// Handle Escape key
		if (event.key === 'Escape') {
			if (isSideNavOpen) {
				isSideNavOpen = false;
			}
			if (isUserMenuOpen) {
				isUserMenuOpen = false;
			}
			if (isNotificationPanelOpen) {
				isNotificationPanelOpen = false;
			}
		}
	}

	function focusMainNavigation() {
		const nav = document.querySelector('[role="navigation"][aria-label="Main navigation"] a');
		if (nav instanceof HTMLElement) {
			nav.focus();
		}
	}

	function focusMainContent() {
		const main = document.querySelector('#main-content, main, [role="main"]');
		if (main instanceof HTMLElement) {
			main.focus();
			main.scrollIntoView({ behavior: 'smooth' });
		}
	}

	function focusSearch() {
		if (searchInputRef) {
			searchInputRef.focus();
		}
	}

	function announceNavigationChange(item: NavigationItem) {
		const announcement = document.createElement('div');
		announcement.setAttribute('aria-live', 'polite');
		announcement.setAttribute('aria-atomic', 'true');
		announcement.className = 'sr-only';
		announcement.textContent = `Navigated to ${item.label}`;

		document.body.appendChild(announcement);

		setTimeout(() => {
			document.body.removeChild(announcement);
		}, 1000);
	}

	function getNavigationItemIcon(item: NavigationItem) {
		return item.icon || Home;
	}

	function isNavigationItemActive(item: NavigationItem): boolean {
		return item.active || false;
	}

	function hasNavigationChildren(item: NavigationItem): boolean {
		return !!(item.children && item.children.length > 0);
	}

	onMount(() => {
		// Set up keyboard shortcuts
		document.addEventListener('keydown', handleKeyboardShortcuts);

		// Update current breakpoint
		const updateBreakpoint = () => {
			currentBreakpoint = getCurrentBreakpoint() || 'large';
		};

		updateBreakpoint();
		window.addEventListener('resize', updateBreakpoint);

		return () => {
			document.removeEventListener('keydown', handleKeyboardShortcuts);
			window.removeEventListener('resize', updateBreakpoint);
		};
	});
</script>

<svelte:window
	on:resize={() => {
		currentBreakpoint = getCurrentBreakpoint() || 'large';
	}}
/>

<div class="carbon-navigation-shell" data-testid="navigation-shell">
	<!-- Skip Link -->
	<SkipToContent href={accessibility.skipToContent.target}>
		{accessibility.skipToContent.label}
	</SkipToContent>

	<!-- Header -->
	<Header role="banner" aria-label="Site header" bind:isSideNavOpen data-testid="header">
		<!-- Company/App Name -->
		<div slot="skip-to-content">
			<SkipToContent href="#main-content">Skip to main content</SkipToContent>
		</div>

		<!-- Platform Name -->
		<HeaderAction
			aria-label="SvelteHR"
			on:click={() => handleNavigate({ id: 'home', label: 'Home', href: '/' })}
		>
			<span class="app-name">SvelteHR</span>
		</HeaderAction>

		<!-- Desktop Navigation -->
		<HeaderNav ariaLabel="Main navigation" data-testid="primary-nav">
			{#each visibleNavItems as item}
				{#if hasNavigationChildren(item)}
					<HeaderNavMenu text={item.label} aria-expanded="false" data-testid="nav-menu-{item.id}">
						{#each item.children || [] as child}
							<HeaderNavItem
								href={child.href}
								text={child.label}
								isSelected={isNavigationItemActive(child)}
								on:click={() => handleNavigate(child)}
								data-testid="nav-child-{child.id}"
							>
								{child.label}
								{#if child.badge}
									<span class="nav-badge" aria-label="Badge: {child.badge}">
										{child.badge}
									</span>
								{/if}
							</HeaderNavItem>
						{/each}
					</HeaderNavMenu>
				{:else}
					<HeaderNavItem
						href={item.href}
						text={item.label}
						isSelected={isNavigationItemActive(item)}
						on:click={() => handleNavigate(item)}
						data-testid="nav-item-{item.id}"
					>
						{item.label}
						{#if item.badge}
							<span class="nav-badge" aria-label="Badge: {item.badge}">
								{item.badge}
							</span>
						{/if}
					</HeaderNavItem>
				{/if}
			{/each}
		</HeaderNav>

		<!-- Header Utilities -->
		<HeaderUtilities>
			<!-- Search -->
			{#if searchEnabled}
				<HeaderSearch
					bind:value={searchQuery}
					bind:ref={searchInputRef}
					placeholder="Search..."
					aria-label="Search the application"
					on:input={handleSearch}
					on:keydown={handleSearchKeydown}
					data-testid="global-search"
				/>
			{/if}

			<!-- Notifications -->
			{#if notifications.length > 0}
				<HeaderGlobalAction
					aria-label="Notifications ({unreadNotifications} unread)"
					tooltipText="Notifications"
					bind:isOpen={isNotificationPanelOpen}
					data-testid="notifications-button"
				>
					<Notification slot="icon" />
					{#if unreadNotifications > 0}
						<span class="notification-badge" aria-hidden="true">
							{unreadNotifications}
						</span>
					{/if}

					<!-- Notification Panel -->
					<HeaderPanelLinks slot="panel" data-testid="notifications-panel">
						<h3>Notifications</h3>
						<HeaderPanelDivider />
						{#each notifications as notification}
							<HeaderPanelLink
								data-testid="notification-{notification.id}"
								class={!notification.read ? 'unread' : ''}
							>
								<div class="notification-content">
									<span class="notification-message">{notification.message}</span>
									<Button
										kind="ghost"
										size="sm"
										iconDescription="Dismiss"
										icon={Close}
										on:click={() => handleNotificationDismiss(notification)}
										aria-label="Dismiss notification: {notification.message}"
										data-testid="dismiss-notification-{notification.id}"
									/>
								</div>
								{#if notification.timestamp}
									<span class="notification-time">
										{new Date(notification.timestamp).toLocaleDateString()}
									</span>
								{/if}
							</HeaderPanelLink>
						{/each}
					</HeaderPanelLinks>
				</HeaderGlobalAction>
			{/if}

			<!-- User Menu -->
			<HeaderGlobalAction
				aria-label="User menu for {user.name}"
				tooltipText="User menu"
				bind:isOpen={isUserMenuOpen}
				data-testid="user-menu-button"
			>
				<UserAvatar slot="icon" />

				<!-- User Panel -->
				<HeaderPanelLinks slot="panel" data-testid="user-menu">
					<div class="user-info">
						{#if user.avatar}
							<img src={user.avatar} alt="" class="user-avatar" aria-hidden="true" />
						{/if}
						<div class="user-details">
							<span class="user-name">{user.name}</span>
							<span class="user-email">{user.email}</span>
							<span class="user-role">{user.role}</span>
						</div>
					</div>

					<HeaderPanelDivider />

					{#each userActions as action}
						{@const ActionIcon = action.icon}
						<HeaderPanelLink
							on:click={() => handleUserAction(action)}
							data-testid="user-action-{action.id}"
						>
							{#if ActionIcon}
								<ActionIcon />
							{/if}
							{action.label}
						</HeaderPanelLink>
					{/each}
				</HeaderPanelLinks>
			</HeaderGlobalAction>
		</HeaderUtilities>
	</Header>

	<!-- Side Navigation (Mobile) -->
	<SideNav bind:isOpen={isSideNavOpen} aria-label="Mobile navigation">
		<SideNavItems>
			{#each visibleNavItems as item}
				{#if hasNavigationChildren(item)}
					<SideNavMenu
						text={item.label}
						icon={getNavigationItemIcon(item)}
						data-testid="mobile-nav-menu-{item.id}"
					>
						{#each item.children || [] as child}
							<SideNavMenuItem
								href={child.href}
								text={child.label}
								isSelected={isNavigationItemActive(child)}
								on:click={() => handleNavigate(child)}
								data-testid="mobile-nav-child-{child.id}"
							/>
						{/each}
					</SideNavMenu>
				{:else}
					<SideNavLink
						href={item.href}
						text={item.label}
						icon={getNavigationItemIcon(item)}
						isSelected={isNavigationItemActive(item)}
						on:click={() => handleNavigate(item)}
						data-testid="mobile-nav-item-{item.id}"
					/>
				{/if}
			{/each}
		</SideNavItems>
	</SideNav>

	<!-- Breadcrumbs -->
	{#if breadcrumbs.length > 0}
		<nav aria-label="Breadcrumb" class="breadcrumb-nav" data-testid="breadcrumbs">
			<div class="breadcrumb-container">
				<Breadcrumb>
					{#each breadcrumbs as crumb, index}
						<BreadcrumbItem
							href={crumb.current ? undefined : crumb.href}
							isCurrentPage={crumb.current}
							data-testid="breadcrumb-{index}"
						>
							{crumb.label}
						</BreadcrumbItem>
					{/each}
				</Breadcrumb>
			</div>
		</nav>
	{/if}

	<!-- Main Content -->
	<main id="main-content" class="main-content" tabindex="-1" data-testid="main-content">
		{@render children?.()}
	</main>
</div>

<style>
	.carbon-navigation-shell {
		min-height: 100vh;
		background: var(--cds-background);
	}

	.app-name {
		font-size: var(--cds-productive-heading-02-font-size);
		font-weight: var(--cds-productive-heading-02-font-weight);
		color: var(--cds-text-inverse);
		text-decoration: none;
	}

	.main-content {
		padding: var(--cds-spacing-06);
		margin-left: 0;
		margin-top: 0;
		transition: margin-left var(--cds-duration-moderate-01) var(--cds-easing-standard);
	}

	.breadcrumb-nav {
		background: var(--cds-layer-01);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.breadcrumb-container {
		padding: var(--cds-spacing-04) var(--cds-spacing-06);
		max-width: 100%;
	}

	.nav-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1rem;
		height: 1rem;
		padding: 0 var(--cds-spacing-02);
		margin-left: var(--cds-spacing-02);
		background: var(--cds-support-error);
		color: var(--cds-text-on-color);
		border-radius: 50%;
		font-size: var(--cds-helper-text-01-font-size);
		font-weight: var(--cds-body-short-01-font-weight);
		line-height: 1;
	}

	.notification-badge {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 1rem;
		height: 1rem;
		padding: 0 var(--cds-spacing-02);
		background: var(--cds-support-error);
		color: var(--cds-text-on-color);
		border-radius: 50%;
		font-size: var(--cds-helper-text-01-font-size);
		font-weight: var(--cds-body-short-01-font-weight);
		line-height: 1;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-05);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.user-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
	}

	.user-name {
		font-size: var(--cds-body-short-01-font-size);
		font-weight: var(--cds-body-short-01-font-weight);
		color: var(--cds-text-primary);
	}

	.user-email {
		font-size: var(--cds-helper-text-01-font-size);
		color: var(--cds-text-secondary);
	}

	.user-role {
		font-size: var(--cds-helper-text-01-font-size);
		color: var(--cds-text-tertiary);
		text-transform: capitalize;
	}

	.notification-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cds-spacing-03);
	}

	.notification-message {
		flex: 1;
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
	}

	.notification-time {
		font-size: var(--cds-helper-text-01-font-size);
		color: var(--cds-text-secondary);
		margin-top: var(--cds-spacing-02);
	}

	:global(.notification-content.unread) {
		font-weight: var(--cds-body-short-02-font-weight);
	}

	/* Responsive adjustments */
	@media (max-width: 1055px) {
		.main-content {
			padding: var(--cds-spacing-05);
		}

		.breadcrumb-container {
			padding: var(--cds-spacing-03) var(--cds-spacing-05);
		}
	}

	@media (max-width: 671px) {
		.main-content {
			padding: var(--cds-spacing-04);
		}

		.breadcrumb-container {
			padding: var(--cds-spacing-03) var(--cds-spacing-04);
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.breadcrumb-nav {
			border-bottom: 2px solid var(--cds-border-strong);
		}

		.nav-badge,
		.notification-badge {
			border: 1px solid var(--cds-border-strong);
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.main-content {
			transition: none;
		}
	}

	/* Focus improvements for accessibility */
	:global(.carbon-navigation-shell .bx--header__action:focus),
	:global(.carbon-navigation-shell .bx--header__menu-item:focus),
	:global(.carbon-navigation-shell .bx--side-nav__link:focus) {
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
</style>
