import type { TaskPriority, TaskStatus } from '$lib/types/task';
import { AlertCircle, CheckCircle, Clock, XCircle } from '@lucide/svelte';

// Status options - NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
export const statusOptions: Array<{ value: TaskStatus; label: string; icon: any; color: string }> =
	[
		{
			value: 'TODO',
			label: 'To Do',
			icon: Clock,
			color: 'text-amber-600'
		},
		{
			value: 'IN_PROGRESS',
			label: 'In Progress',
			icon: CheckCircle,
			color: 'text-blue-600'
		},
		{
			value: 'BLOCKED',
			label: 'Blocked',
			icon: AlertCircle,
			color: 'text-red-600'
		},
		{
			value: 'REVIEW',
			label: 'Deferred',
			icon: XCircle,
			color: 'text-gray-600'
		},
		{
			value: 'DONE',
			label: 'Completed',
			icon: CheckCircle,
			color: 'text-green-600'
		}
	];

// Priority options - NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
export const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
	{ value: 'LOW', label: 'Low', color: 'bg-gray-500' },
	{ value: 'MEDIUM', label: 'Medium', color: 'bg-blue-500' },
	{ value: 'HIGH', label: 'High', color: 'bg-orange-500' },
	{ value: 'URGENT', label: 'Urgent', color: 'bg-red-500' }
];
