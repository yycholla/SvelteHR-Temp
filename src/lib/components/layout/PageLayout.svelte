<script lang="ts">
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		SideNav,
		SideNavItems,
		SideNavMenu,
		SideNavMenuItem,
		SideNavLink,
		Content,
		SkipToContent,
		HeaderAction,
		HeaderPanelLinks,
		HeaderPanelDivider,
		HeaderPanelLink
	} from 'carbon-components-svelte';
	import {
		Dashboard,
		User,
		UserMultiple,
		Calendar,
		Settings,
		Logout,
		Menu,
		Close,
		Notification,
		UserAvatar
	} from 'carbon-icons-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageLayoutProps } from '../../../contracts/component-interface';

	export let title: PageLayoutProps['title'] = '';
	export let subtitle: PageLayoutProps['subtitle'] = '';
	export let breadcrumbs: PageLayoutProps['breadcrumbs'] = [];
	export let showHeader: PageLayoutProps['showHeader'] = true;
	export let showSidebar: PageLayoutProps['showSidebar'] = true;
	export let sidebarExpanded: PageLayoutProps['sidebarExpanded'] = false;
	export let headerActions: PageLayoutProps['headerActions'] = [];
	export let user: PageLayoutProps['user'] = null;
	export let notifications: PageLayoutProps['notifications'] = [];
	export let maxWidth: PageLayoutProps['maxWidth'] = 'none';
	export let padding: PageLayoutProps['padding'] = 'md';
	export let headerTheme: PageLayoutProps['headerTheme'] = 'g100';
	export let sidebarTheme: PageLayoutProps['sidebarTheme'] = 'g10';

	let isSideNavOpen = sidebarExpanded;
	let notificationsPanelOpen = false;
	let userMenuOpen = false;

	// Navigation items based on user role
	$: navigationItems = [
		{
			text: 'Dashboard',
			href: '/dashboard',
			icon: Dashboard,
			roles: ['employee', 'manager', 'hr', 'admin']
		},
		{
			text: 'My Profile',
			href: '/profile',
			icon: User,
			roles: ['employee', 'manager', 'hr', 'admin']
		},
		{
			text: 'Leave Requests',
			href: '/leave',
			icon: Calendar,
			roles: ['employee', 'manager', 'hr', 'admin'],
			submenu: [
				{ text: 'My Requests', href: '/leave/requests' },
				{ text: 'New Request', href: '/leave/new' },
				{ text: 'Balance', href: '/leave/balance' }
			]
		},
		{
			text: 'Team Management',
			href: '/team',
			icon: UserMultiple,
			roles: ['manager', 'hr', 'admin'],
			submenu: [
				{ text: 'Team Overview', href: '/team' },
				{ text: 'Team Leave', href: '/team/leave' },
				{ text: 'Performance', href: '/team/performance' }
			]
		},
		{
			text: 'Administration',
			href: '/admin',
			icon: Settings,
			roles: ['hr', 'admin'],
			submenu: [
				{ text: 'Users', href: '/admin/users' },
				{ text: 'Departments', href: '/admin/departments' },
				{ text: 'Roles', href: '/admin/roles' },
				{ text: 'Settings', href: '/admin/settings' }
			]
		}
	];

	// Get current path for active state
	$: currentPath = $page.url.pathname;

	// Filter navigation based on user role
	$: visibleNavigation = user
		? navigationItems.filter((item) => item.roles.includes(user.role?.toLowerCase() || 'employee'))
		: [];

	function toggleSideNav() {
		isSideNavOpen = !isSideNavOpen;
	}

	function closeSideNav() {
		isSideNavOpen = false;
	}

	function toggleNotifications() {
		notificationsPanelOpen = !notificationsPanelOpen;
		userMenuOpen = false;
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
		notificationsPanelOpen = false;
	}

	function handleLogout() {
		// Dispatch logout event
		const event = new CustomEvent('logout', { detail: { timestamp: Date.now() } });
		document.dispatchEvent(event);
		goto('/login');
	}

	function isActiveRoute(href: string): boolean {
		if (href === '/dashboard' && currentPath === '/') return true;
		return currentPath === href || currentPath.startsWith(href + '/');
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isSideNavOpen = false;
			notificationsPanelOpen = false;
			userMenuOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// Accessibility announcements
	$: announcePageChange(title);

	function announcePageChange(pageTitle: string) {
		if (typeof window !== 'undefined' && pageTitle) {
			// Create announcement for screen readers
			const announcement = document.createElement('div');
			announcement.setAttribute('aria-live', 'polite');
			announcement.setAttribute('aria-atomic', 'true');
			announcement.className = 'sr-only';
			announcement.textContent = `Navigated to ${pageTitle}`;
			document.body.appendChild(announcement);

			setTimeout(() => {
				document.body.removeChild(announcement);
			}, 1000);
		}
	}
</script>

<svelte:head>
	<title>{title ? `${title} - SvelteHR` : 'SvelteHR'}</title>
	{#if subtitle}
		<meta name="description" content={subtitle} />
	{/if}
</svelte:head>

<!-- Skip to content link for accessibility -->
{#if showHeader}
	<SkipToContent />
{/if}

<div
	class="page-layout"
	class:page-layout--no-header={!showHeader}
	class:page-layout--no-sidebar={!showSidebar}
>
	{#if showHeader}
		<Header
			company="SvelteHR"
			platformName="Human Resources"
			bind:isSideNavOpen
			theme={headerTheme}
		>
			<!-- Header Navigation -->
			<HeaderNav aria-label="Primary navigation">
				<HeaderNavItem
					href="/dashboard"
					text="Dashboard"
					isSelected={isActiveRoute('/dashboard')}
				/>
				<HeaderNavItem href="/leave" text="Leave" isSelected={isActiveRoute('/leave')} />
				{#if user && ['manager', 'hr', 'admin'].includes(user.role?.toLowerCase() || '')}
					<HeaderNavItem href="/team" text="Team" isSelected={isActiveRoute('/team')} />
				{/if}
				{#if user && ['hr', 'admin'].includes(user.role?.toLowerCase() || '')}
					<HeaderNavItem href="/admin" text="Admin" isSelected={isActiveRoute('/admin')} />
				{/if}
			</HeaderNav>

			<!-- Header Actions -->
			<svelte:fragment slot="header-actions">
				<!-- Custom Header Actions -->
				{#each headerActions as action}
					<HeaderAction
						bind:isOpen={action.isOpen}
						icon={action.icon}
						closeIcon={Close}
						text={action.text}
						on:click={action.onClick}
					>
						{#if action.panel}
							<HeaderPanelLinks>
								{#each action.panel as panelItem}
									{#if panelItem.divider}
										<HeaderPanelDivider />
									{:else}
										<HeaderPanelLink href={panelItem.href} on:click={panelItem.onClick}>
											{panelItem.text}
										</HeaderPanelLink>
									{/if}
								{/each}
							</HeaderPanelLinks>
						{/if}
					</HeaderAction>
				{/each}

				<!-- Notifications -->
				{#if notifications.length > 0}
					<HeaderAction
						bind:isOpen={notificationsPanelOpen}
						icon={Notification}
						closeIcon={Close}
						text="Notifications ({notifications.length})"
						on:click={toggleNotifications}
					>
						<HeaderPanelLinks>
							{#each notifications.slice(0, 5) as notification}
								<HeaderPanelLink href={notification.href || '#'}>
									<div class="notification-item">
										<div class="notification-title">{notification.title}</div>
										{#if notification.message}
											<div class="notification-message">{notification.message}</div>
										{/if}
										{#if notification.timestamp}
											<div class="notification-time">
												{new Date(notification.timestamp).toLocaleString()}
											</div>
										{/if}
									</div>
								</HeaderPanelLink>
							{/each}
							{#if notifications.length > 5}
								<HeaderPanelDivider />
								<HeaderPanelLink href="/notifications">View all notifications</HeaderPanelLink>
							{/if}
						</HeaderPanelLinks>
					</HeaderAction>
				{/if}

				<!-- User Menu -->
				{#if user}
					<HeaderAction
						bind:isOpen={userMenuOpen}
						icon={UserAvatar}
						closeIcon={Close}
						text="User menu for {user.name}"
						on:click={toggleUserMenu}
					>
						<HeaderPanelLinks>
							<HeaderPanelLink href="/profile">
								<div class="user-info">
									<div class="user-name">{user.name}</div>
									<div class="user-email">{user.email}</div>
									<div class="user-role">{user.role}</div>
								</div>
							</HeaderPanelLink>
							<HeaderPanelDivider />
							<HeaderPanelLink href="/profile">My Profile</HeaderPanelLink>
							<HeaderPanelLink href="/settings">Settings</HeaderPanelLink>
							<HeaderPanelDivider />
							<HeaderPanelLink on:click={handleLogout}>Sign Out</HeaderPanelLink>
						</HeaderPanelLinks>
					</HeaderAction>
				{/if}
			</svelte:fragment>
		</Header>
	{/if}

	{#if showSidebar}
		<SideNav bind:isOpen={isSideNavOpen} theme={sidebarTheme} aria-label="Side navigation">
			<SideNavItems>
				{#each visibleNavigation as navItem}
					{#if navItem.submenu}
						<SideNavMenu
							text={navItem.text}
							icon={navItem.icon}
							expanded={isActiveRoute(navItem.href)}
						>
							{#each navItem.submenu as subItem}
								<SideNavMenuItem
									href={subItem.href}
									text={subItem.text}
									isSelected={isActiveRoute(subItem.href)}
									on:click={closeSideNav}
								/>
							{/each}
						</SideNavMenu>
					{:else}
						<SideNavLink
							href={navItem.href}
							text={navItem.text}
							icon={navItem.icon}
							isSelected={isActiveRoute(navItem.href)}
							on:click={closeSideNav}
						/>
					{/if}
				{/each}
			</SideNavItems>
		</SideNav>
	{/if}

	<Content class="page-content" style="max-width: {maxWidth === 'none' ? 'none' : maxWidth};">
		<!-- Page Header -->
		{#if title || subtitle || breadcrumbs.length > 0}
			<div class="page-header carbon-spacing-{padding}">
				<!-- Breadcrumbs -->
				{#if breadcrumbs.length > 0}
					<nav aria-label="Breadcrumb" class="breadcrumb-nav">
						<ol class="breadcrumb-list">
							{#each breadcrumbs as crumb, index}
								<li class="breadcrumb-item">
									{#if crumb.href && index < breadcrumbs.length - 1}
										<a href={crumb.href} class="breadcrumb-link">
											{crumb.text}
										</a>
									{:else}
										<span class="breadcrumb-current" aria-current="page">
											{crumb.text}
										</span>
									{/if}
									{#if index < breadcrumbs.length - 1}
										<span class="breadcrumb-separator" aria-hidden="true">/</span>
									{/if}
								</li>
							{/each}
						</ol>
					</nav>
				{/if}

				<!-- Page Title -->
				{#if title}
					<h1 class="page-title">{title}</h1>
				{/if}

				<!-- Page Subtitle -->
				{#if subtitle}
					<p class="page-subtitle">{subtitle}</p>
				{/if}
			</div>
		{/if}

		<!-- Main Content -->
		<main class="main-content" aria-label={title ? `${title} content` : 'Main content'}>
			{#if title || subtitle || breadcrumbs?.length}
				<div class="page-header">
					{#if breadcrumbs?.length}
						<nav class="breadcrumbs" aria-label="Breadcrumb navigation">
							{#each breadcrumbs as crumb, index}
								{#if crumb.href}
									<a href={crumb.href} class="breadcrumb-link">{crumb.text}</a>
								{:else}
									<span class="breadcrumb-current">{crumb.text}</span>
								{/if}
								{#if index < breadcrumbs.length - 1}
									<span class="breadcrumb-separator">/</span>
								{/if}
							{/each}
						</nav>
					{/if}

					{#if title}
						<h1 class="page-title">{title}</h1>
					{/if}

					{#if subtitle}
						<p class="page-subtitle">{subtitle}</p>
					{/if}
				</div>
			{/if}

			<div class="page-content-wrapper">
				<slot />
			</div>
		</main>
	</Content>
</div>

<style>
	:global(.page-layout) {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	:global(.page-content) {
		flex: 1;
		transition: margin-left 0.11s cubic-bezier(0.2, 0, 0.38, 0.9);
	}

	.main-content {
		padding: var(--cds-spacing-06);
	}

	.page-header {
		margin-bottom: var(--cds-spacing-08);
	}

	/* Breadcrumbs */
	.breadcrumbs {
		margin-bottom: var(--cds-spacing-05);
	}

	.breadcrumb-link {
		color: var(--cds-link-primary);
		text-decoration: none;
		font-size: var(--cds-label-01-font-size);
		line-height: var(--cds-label-01-line-height);
	}

	.breadcrumb-link:hover {
		text-decoration: underline;
	}

	.breadcrumb-current {
		color: var(--cds-text-primary);
		font-size: var(--cds-label-01-font-size);
		line-height: var(--cds-label-01-line-height);
	}

	.breadcrumb-separator {
		color: var(--cds-text-secondary);
		margin: 0 var(--cds-spacing-03);
	}

	/* Page Title */
	.page-title {
		font-size: var(--cds-productive-heading-05-font-size);
		font-weight: var(--cds-productive-heading-05-font-weight);
		line-height: var(--cds-productive-heading-05-line-height);
		letter-spacing: var(--cds-productive-heading-05-letter-spacing);
		color: var(--cds-text-primary);
		margin: 0 0 var(--cds-spacing-03) 0;
	}

	.page-subtitle {
		font-size: var(--cds-body-long-02-font-size);
		line-height: var(--cds-body-long-02-line-height);
		color: var(--cds-text-secondary);
		margin: 0;
	}

	.page-content-wrapper {
		/* Container for page content with proper spacing */
		min-height: calc(100vh - var(--cds-header-height, 48px) - var(--cds-spacing-12));
	}

	.content-wrapper {
		position: relative;
		margin: 0 auto;
		width: 100%;
		transition: opacity 0.2s ease-in-out;
	}

	.content-wrapper.loading {
		opacity: 0.5;
	}

	.loading-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 1000;
	}

	.loading-spinner {
		width: 42px;
		height: 42px;
		border: 3px solid var(--cds-border-subtle);
		border-top-color: var(--cds-link-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.header-search {
		margin-right: var(--cds-spacing-05);
		min-width: 200px;
	}

	.notification-badge {
		position: absolute;
		top: 0;
		right: 0;
		background: var(--cds-support-error);
		color: white;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		font-size: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.notification-item {
		padding: var(--cds-spacing-03);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.toast-container {
		position: fixed;
		bottom: var(--cds-spacing-05);
		right: var(--cds-spacing-05);
		z-index: 9000;
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	/* Responsive adjustments */
	@media (max-width: 672px) {
		.header-search {
			display: none;
		}

		.page-content.with-padding {
			padding: var(--cds-spacing-03);
		}

		.page-header {
			padding: var(--cds-spacing-03) 0;
		}
	}

	@media (max-width: 1056px) {
		.header-search {
			min-width: 150px;
		}
	}

	/* Accessibility improvements */
	@media (prefers-reduced-motion: reduce) {
		:global(.page-content),
		.content-wrapper,
		.loading-spinner {
			transition: none !important;
			animation: none !important;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.page-header {
			border-bottom-width: 2px;
		}

		.notification-badge {
			outline: 2px solid var(--cds-background);
		}
	}

	/* Screen reader only content */
	.sr-only {
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

	/* Focus visible improvements */
	:global(.page-layout *:focus-visible) {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}

	/* Print styles */
	@media print {
		:global(.bx--header),
		:global(.bx--side-nav),
		.toast-container,
		.loading-overlay {
			display: none !important;
		}

		.page-content {
			margin: 0 !important;
		}
	}
</style>
