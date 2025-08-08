export type UserRole = 'Admin' | 'Manager' | 'HR' | 'Employee';

export type CardSize = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '1x3' | '3x2' | '2x3';

export type CardTag = 
	| 'personal'
	| 'team' 
	| 'metrics'
	| 'reports'
	| 'admin'
	| 'compliance'
	| 'tasks'
	| 'leave'
	| 'performance'
	| 'notifications'
	| 'system'
	| 'hr'
	| 'finance';

export interface CardPosition {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface CardMetadata {
	id: string;
	title: string;
	description: string;
	component: string; // Component file name
	tags: CardTag[];
	requiredRoles: UserRole[];
	defaultSize: CardSize;
	minSize: CardSize;
	maxSize: CardSize;
	allowResize: boolean;
	refreshInterval?: number; // Auto-refresh in seconds
	configurable?: boolean; // Can user configure this card
	icon?: string; // Lucide icon name
}

export interface CardInstance {
	id: string;
	cardId: string; // Reference to CardMetadata
	position: CardPosition;
	size: CardSize;
	config?: Record<string, any>; // User configuration
	visible: boolean;
}

export interface DashboardLayout {
	id: string;
	name: string;
	cards: CardInstance[];
	gridCols: number;
	gridRows: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserDashboardPreferences {
	layouts: DashboardLayout[];
	activeLayoutId: string;
	theme?: 'light' | 'dark' | 'auto';
	autoRefresh: boolean;
	refreshInterval: number;
}

export interface CardProps {
	instance: CardInstance;
	metadata: CardMetadata;
	data?: any;
	loading?: boolean;
	error?: string;
	onRefresh?: () => void;
	onConfigure?: (config: Record<string, any>) => void;
	onRemove?: () => void;
}