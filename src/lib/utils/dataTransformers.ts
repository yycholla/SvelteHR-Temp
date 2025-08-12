/**
 * Data transformation utilities for streaming components
 * Provides consistent, reusable data processing functions
 */

// Safe array operations
export function safeArray<T>(data: unknown): T[] {
	return Array.isArray(data) ? data : [];
}

export function safeFilter<T>(data: unknown, predicate: (item: T) => boolean): T[] {
	return safeArray<T>(data).filter(predicate);
}

export function safeMap<T, R>(data: unknown, mapper: (item: T) => R): R[] {
	return safeArray<T>(data).map(mapper);
}

export function safeSlice<T>(data: unknown, start?: number, end?: number): T[] {
	return safeArray<T>(data).slice(start, end);
}

// Common data transformations
export interface EmployeeStats {
	totalEmployees: number;
	activeEmployees: number;
	onboardingEmployees: number;
	inactiveEmployees: number;
}

export function transformEmployeeStats(employees: unknown): EmployeeStats {
	const employeeData = typeof employees === 'object' && employees !== null 
		? (employees as any).data || employees 
		: [];
	
	const empArray = safeArray(employeeData);
	
	return {
		totalEmployees: typeof employees === 'object' && employees !== null 
			? (employees as any).total || empArray.length 
			: empArray.length,
		activeEmployees: empArray.filter((e: any) => e.status === 'Active').length,
		onboardingEmployees: empArray.filter((e: any) => e.status === 'Onboarding').length,
		inactiveEmployees: empArray.filter((e: any) => e.status === 'PreHire' || e.status === 'Terminated').length
	};
}

export interface TaskStats {
	totalTasks: number;
	pendingTasks: number;
	inProgressTasks: number;
	completedTasks: number;
	overdueTasks: number;
}

export function transformTaskStats(tasks: unknown): TaskStats {
	const taskArray = safeArray(tasks);
	
	return {
		totalTasks: taskArray.length,
		pendingTasks: taskArray.filter((t: any) => t.status === 'Pending').length,
		inProgressTasks: taskArray.filter((t: any) => t.status === 'InProgress').length,
		completedTasks: taskArray.filter((t: any) => t.status === 'Completed').length,
		overdueTasks: taskArray.filter((t: any) => {
			if (!t.dueDate) return false;
			return new Date(t.dueDate) < new Date();
		}).length
	};
}

export interface DepartmentData {
	department: string;
	count: number;
	percentage: number;
}

export function transformDepartmentData(employees: unknown): DepartmentData[] {
	const employeeData = typeof employees === 'object' && employees !== null 
		? (employees as any).data || employees 
		: [];
	
	const empArray = safeArray(employeeData);
	
	if (empArray.length === 0) return [];
	
	const deptCounts = empArray.reduce((acc: Record<string, number>, emp: any) => {
		// Use transformed department field
		const deptName = emp.department?.name || 'Unassigned';
		acc[deptName] = (acc[deptName] || 0) + 1;
		return acc;
	}, {});
	
	const total = empArray.length;
	
	return Object.entries(deptCounts).map(([department, count]) => ({
		department,
		count,
		percentage: Math.round((count / total) * 100)
	}));
}

export interface ActivityItem {
	id: string | number;
	title: string;
	description: string;
	timestamp: Date;
	type?: string;
}

export function transformActivityData(events: unknown, limit = 5): ActivityItem[] {
	return safeSlice(events, 0, limit).map((event: any) => ({
		id: event.id || Math.random().toString(36),
		title: event.title || 'System Activity',
		description: event.description || 'Recent system event',
		timestamp: event.createdAt ? new Date(event.createdAt) : new Date(),
		type: event.type || 'general'
	}));
}

export interface TaskItem {
	id: string | number;
	title: string;
	dueDate: Date;
	priority: 'low' | 'medium' | 'high' | 'critical';
	type: string;
	status: string;
}

export function transformTaskData(tasks: unknown, limit = 10): TaskItem[] {
	return safeSlice(
		safeFilter(tasks, (task: any) => 
			task.status === 'Pending' || task.status === 'InProgress'
		), 
		0, 
		limit
	).map((task: any) => ({
		id: task.id || Math.random().toString(36),
		title: task.title || 'Untitled Task',
		dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
		priority: task.priority || 'medium',
		type: task.relatedEntityType || 'General',
		status: task.status
	}));
}

// Date formatting utilities
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const defaultOptions: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	};
	
	return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

export function formatDateShort(date: Date | string): string {
	return formatDate(date, { month: 'short', day: 'numeric' });
}

export function isOverdue(dueDate: Date | string | null): boolean {
	if (!dueDate) return false;
	const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
	return dateObj < new Date();
}

// Validation utilities
export function isValidData(data: unknown): boolean {
	return data !== null && data !== undefined;
}

export function hasData(data: unknown): boolean {
	if (!isValidData(data)) return false;
	if (Array.isArray(data)) return data.length > 0;
	if (typeof data === 'object') {
		const obj = data as Record<string, unknown>;
		return Object.keys(obj).length > 0;
	}
	return true;
}

// Trend calculation utilities
export interface TrendData {
	current: number;
	previous: number;
	change: number;
	changePercent: number;
	type: 'positive' | 'negative' | 'neutral';
}

export function calculateTrend(current: number, previous: number): TrendData {
	const change = current - previous;
	const changePercent = previous === 0 ? 0 : Math.round((change / previous) * 100);
	
	let type: 'positive' | 'negative' | 'neutral' = 'neutral';
	if (change > 0) type = 'positive';
	else if (change < 0) type = 'negative';
	
	return {
		current,
		previous,
		change,
		changePercent,
		type
	};
}