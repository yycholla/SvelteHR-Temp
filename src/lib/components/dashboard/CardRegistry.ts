import type { CardMetadata, UserRole, CardTag } from './types.js';

// Card definitions based on the available API endpoints
export const CARD_DEFINITIONS: CardMetadata[] = [
	// Personal/Employee Cards
	{
		id: 'personal-info',
		title: 'My Profile',
		description: 'Your personal information and contact details',
		component: 'PersonalInfoCard',
		tags: ['personal'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '2x1',
		minSize: '2x1',
		maxSize: '2x2',
		allowResize: true,
		icon: 'User'
	},
	{
		id: 'my-tasks',
		title: 'My Tasks',
		description: 'Tasks assigned to you',
		component: 'MyTasksCard',
		tags: ['personal', 'tasks'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '2x3', // Increased size for task list
		minSize: '2x2',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 300,
		icon: 'CheckSquare'
	},
	{
		id: 'leave-balance',
		title: 'Leave Balance',
		description: 'Your available leave days and upcoming requests',
		component: 'LeaveBalanceCard',
		tags: ['personal', 'leave'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '2x1',
		minSize: '1x1',
		maxSize: '2x2',
		allowResize: true,
		refreshInterval: 3600,
		icon: 'Calendar'
	},
	{
		id: 'notifications',
		title: 'Notifications',
		description: 'Recent notifications and alerts',
		component: 'NotificationsCard',
		tags: ['personal', 'notifications'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '1x2',
		minSize: '1x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 60,
		icon: 'Bell'
	},

	// Team/Manager Cards
	{
		id: 'team-overview',
		title: 'My Team',
		description: 'Overview of your direct reports',
		component: 'TeamOverviewCard',
		tags: ['team', 'metrics'],
		requiredRoles: ['Manager', 'HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 600,
		icon: 'Users'
	},
	{
		id: 'team-tasks',
		title: 'Team Tasks',
		description: 'Tasks assigned to your team members',
		component: 'TeamTasksCard',
		tags: ['team', 'tasks'],
		requiredRoles: ['Manager', 'HR', 'Admin'],
		defaultSize: '3x2',
		minSize: '2x2',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 300,
		icon: 'ListTodo'
	},
	{
		id: 'approval-queue',
		title: 'Pending Approvals',
		description: 'Leave requests and other items requiring your approval',
		component: 'ApprovalQueueCard',
		tags: ['team', 'tasks'],
		requiredRoles: ['Manager', 'HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 180,
		icon: 'CheckCircle'
	},
	{
		id: 'team-performance',
		title: 'Team Performance',
		description: 'Key performance metrics for your team',
		component: 'TeamPerformanceCard',
		tags: ['team', 'metrics', 'performance'],
		requiredRoles: ['Manager', 'HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 1800,
		configurable: true,
		icon: 'TrendingUp'
	},

	// HR/Admin Cards
	{
		id: 'employee-metrics',
		title: 'Employee Metrics',
		description: 'Company-wide employee statistics and trends',
		component: 'EmployeeMetricsCard',
		tags: ['hr', 'metrics', 'reports'],
		requiredRoles: ['HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 3600,
		configurable: true,
		icon: 'BarChart3'
	},
	{
		id: 'compliance-status',
		title: 'Compliance Status',
		description: 'Overall compliance tracking and alerts',
		component: 'ComplianceStatusCard',
		tags: ['hr', 'compliance', 'metrics'],
		requiredRoles: ['HR', 'Admin'],
		defaultSize: '2x1',
		minSize: '2x1',
		maxSize: '2x2',
		allowResize: true,
		refreshInterval: 1800,
		icon: 'Shield'
	},
	{
		id: 'leave-overview',
		title: 'Company Leave Overview',
		description: 'Leave requests and balances across the organization',
		component: 'LeaveOverviewCard',
		tags: ['hr', 'leave', 'metrics'],
		requiredRoles: ['HR', 'Admin'],
		defaultSize: '3x2',
		minSize: '2x2',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 1800,
		icon: 'CalendarDays'
	},
	// Real Data Cards (Test)
	{
		id: 'employee-statistics-live',
		title: 'Employee Statistics (Live)',
		description: 'Real-time employee statistics and metrics',
		component: 'EmployeeStatisticsCard',
		tags: ['test', 'statistics', 'employees'],
		requiredRoles: ['HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 600,
		icon: 'Users'
	},
	{
		id: 'tasks-live',
		title: 'Live Tasks Overview',
		description: 'Real-time task management and status',
		component: 'LiveTasksCard',
		tags: ['test', 'tasks', 'management'],
		requiredRoles: ['Manager', 'HR', 'Admin'],
		defaultSize: '3x2',
		minSize: '2x2',
		maxSize: '3x3',
		allowResize: true,
		refreshInterval: 300,
		icon: 'ListTodo'
	},
	{
		id: 'compliance-status-live',
		title: 'Compliance Status (Live)',
		description: 'Real-time compliance tracking and alerts',
		component: 'LiveComplianceCard',
		tags: ['test', 'compliance', 'monitoring'],
		requiredRoles: ['HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 900,
		icon: 'Shield'
	},
	{
		id: 'notifications-live',
		title: 'Live Notifications',
		description: 'Real-time notification feed',
		component: 'LiveNotificationsCard',
		tags: ['test', 'notifications', 'alerts'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 60,
		icon: 'Bell'
	},
	{
		id: 'hr-requests',
		title: 'HR Requests',
		description: 'Pending HR requests and inquiries',
		component: 'HRRequestsCard',
		tags: ['hr', 'tasks'],
		requiredRoles: ['HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 300,
		icon: 'MessageSquare'
	},

	// Admin-Only Cards
	{
		id: 'api-performance',
		title: 'API Performance',
		description: 'Real-time API metrics and performance data',
		component: 'APIPerformanceCard',
		tags: ['admin', 'system', 'metrics'],
		requiredRoles: ['Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 30,
		configurable: true,
		icon: 'Activity'
	},
	{
		id: 'system-health',
		title: 'System Health',
		description: 'Database connections, memory usage, and system metrics',
		component: 'SystemHealthCard',
		tags: ['admin', 'system', 'metrics'],
		requiredRoles: ['Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 60,
		icon: 'Server'
	},
	{
		id: 'user-activity',
		title: 'User Activity',
		description: 'Recent user login activity and session information',
		component: 'UserActivityCard',
		tags: ['admin', 'system', 'reports'],
		requiredRoles: ['Admin'],
		defaultSize: '3x2',
		minSize: '2x2',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 300,
		icon: 'Users2'
	},
	{
		id: 'audit-log',
		title: 'Audit Log',
		description: 'Recent system changes and administrative actions',
		component: 'AuditLogCard',
		tags: ['admin', 'system', 'reports'],
		requiredRoles: ['Admin'],
		defaultSize: '3x2',
		minSize: '2x2',
		maxSize: '3x2',
		allowResize: true,
		refreshInterval: 180,
		icon: 'FileSearch'
	},

	// Universal Cards
	{
		id: 'quick-actions',
		title: 'Quick Actions',
		description: 'Common actions and shortcuts',
		component: 'QuickActionsCard',
		tags: ['personal'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '2x1',
		minSize: '2x1',
		maxSize: '3x1',
		allowResize: true,
		configurable: true,
		icon: 'Zap'
	},
	{
		id: 'calendar-events',
		title: 'Upcoming Events',
		description: 'Company events and calendar items',
		component: 'CalendarEventsCard',
		tags: ['personal'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '2x2',
		minSize: '2x1',
		maxSize: '2x3',
		allowResize: true,
		refreshInterval: 1800,
		icon: 'Calendar'
	},
	{
		id: 'weather',
		title: 'Weather',
		description: 'Local weather information',
		component: 'WeatherCard',
		tags: ['personal'],
		requiredRoles: ['Employee', 'Manager', 'HR', 'Admin'],
		defaultSize: '1x1',
		minSize: '1x1',
		maxSize: '2x1',
		allowResize: true,
		refreshInterval: 1800,
		configurable: true,
		icon: 'Cloud'
	}
];

export class CardRegistry {
	private static instance: CardRegistry;
	private cards: Map<string, CardMetadata> = new Map();

	private constructor() {
		// Initialize with predefined cards
		CARD_DEFINITIONS.forEach((card) => {
			this.cards.set(card.id, card);
		});
	}

	static getInstance(): CardRegistry {
		if (!CardRegistry.instance) {
			CardRegistry.instance = new CardRegistry();
		}
		return CardRegistry.instance;
	}

	/**
	 * Get all available cards for a user role
	 */
	getAvailableCards(userRole: UserRole): CardMetadata[] {
		return Array.from(this.cards.values())
			.filter((card) => card.requiredRoles.includes(userRole))
			.sort((a, b) => a.title.localeCompare(b.title));
	}

	/**
	 * Get cards filtered by tags
	 */
	getCardsByTags(tags: CardTag[], userRole: UserRole): CardMetadata[] {
		return this.getAvailableCards(userRole).filter((card) =>
			tags.some((tag) => card.tags.includes(tag))
		);
	}

	/**
	 * Get a specific card by ID
	 */
	getCard(id: string): CardMetadata | undefined {
		return this.cards.get(id);
	}

	/**
	 * Register a new card (for plugins or custom cards)
	 */
	registerCard(card: CardMetadata): void {
		this.cards.set(card.id, card);
	}

	/**
	 * Get all registered cards
	 */
	getAllCards(): CardMetadata[] {
		return Array.from(this.cards.values());
	}

	/**
	 * Search cards by title or description
	 */
	searchCards(query: string, userRole: UserRole): CardMetadata[] {
		const lowerQuery = query.toLowerCase();
		return this.getAvailableCards(userRole).filter(
			(card) =>
				card.title.toLowerCase().includes(lowerQuery) ||
				card.description.toLowerCase().includes(lowerQuery) ||
				card.tags.some((tag) => tag.includes(lowerQuery))
		);
	}

	/**
	 * Get default layout for a user role
	 */
	getDefaultLayout(userRole: UserRole): CardMetadata[] {
		const baseCards = ['personal-info', 'my-tasks', 'leave-balance', 'notifications'];

		switch (userRole) {
			case 'Admin':
				return this.getCardsByIds([
					...baseCards,
					'api-performance',
					'system-health',
					'employee-metrics',
					'compliance-status',
					'user-activity'
				]);
			case 'HR':
				return this.getCardsByIds([
					...baseCards,
					'employee-metrics',
					'compliance-status',
					'leave-overview',
					'hr-requests'
				]);
			case 'Manager':
				return this.getCardsByIds([
					...baseCards,
					'team-overview',
					'team-tasks',
					'approval-queue',
					'team-performance'
				]);
			default:
				return this.getCardsByIds([...baseCards, 'quick-actions', 'calendar-events']);
		}
	}

	private getCardsByIds(ids: string[]): CardMetadata[] {
		return ids
			.map((id) => this.cards.get(id))
			.filter((card) => card !== undefined) as CardMetadata[];
	}
}

// Export singleton instance
export const cardRegistry = CardRegistry.getInstance();
