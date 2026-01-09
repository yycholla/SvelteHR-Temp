/**
 * Component Interface Contracts
 *
 * Type definitions for component props and interfaces used in contract tests.
 * These interfaces define the expected shape of component props for testing.
 */

export interface UserInfo {
	name: string;
	email: string;
	role: string;
	avatar?: string;
}

export interface BreadcrumbItem {
	text: string;
	href?: string;
	icon?: string;
}

export interface HeaderAction {
	text: string;
	label?: string;
	icon?: string;
	onClick?: () => void;
	href?: string;
	panel?: Array<{
		text?: string;
		href?: string;
		onClick?: () => void;
		divider?: boolean;
	}>;
}

export interface NotificationItem {
	id: string;
	title: string;
	message: string;
	timestamp: Date | string;
	read?: boolean;
	type?: 'info' | 'warning' | 'error' | 'success';
	href?: string;
}

export interface PageLayoutProps {
	title?: string;
	subtitle?: string;
	showHeader?: boolean;
	showSidebar?: boolean;
	sidebarExpanded?: boolean;
	breadcrumbs?: BreadcrumbItem[];
	user?: UserInfo;
	notifications?: NotificationItem[];
	headerActions?: HeaderAction[];
	maxWidth?: string;
	padding?: 'sm' | 'md' | 'lg';
	headerTheme?: 'white' | 'g10' | 'g90' | 'g100';
	sidebarTheme?: 'white' | 'g10' | 'g90' | 'g100';
}
