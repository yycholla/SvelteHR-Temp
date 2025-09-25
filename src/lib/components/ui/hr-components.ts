// HR-specific component configurations and utilities
// Built on top of shadcn-svelte components for HR application

import { type VariantProps, tv } from 'tailwind-variants';

// Status badge variants for HR entities
export const statusBadgeVariants = tv({
	base: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
	variants: {
		variant: {
			// Leave status variants
			pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
			approved: 'bg-green-50 text-green-700 ring-green-600/20',
			rejected: 'bg-red-50 text-red-700 ring-red-600/20',
			cancelled: 'bg-gray-50 text-gray-700 ring-gray-600/20',
			inProgress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
			completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',

			// Attendance status variants
			present: 'bg-green-50 text-green-700 ring-green-600/20',
			absent: 'bg-red-50 text-red-700 ring-red-600/20',
			late: 'bg-orange-50 text-orange-700 ring-orange-600/20',
			partialDay: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
			holiday: 'bg-purple-50 text-purple-700 ring-purple-600/20',
			vacation: 'bg-blue-50 text-blue-700 ring-blue-600/20',
			sick: 'bg-pink-50 text-pink-700 ring-pink-600/20',

			// Onboarding status variants
			preHire: 'bg-slate-50 text-slate-700 ring-slate-600/20',
			onboarding: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
			active: 'bg-green-50 text-green-700 ring-green-600/20',
			leave: 'bg-amber-50 text-amber-700 ring-amber-600/20',
			terminated: 'bg-red-50 text-red-700 ring-red-600/20',
			alumni: 'bg-gray-50 text-gray-700 ring-gray-600/20',

			// Performance rating variants
			exceeds: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
			meets: 'bg-green-50 text-green-700 ring-green-600/20',
			approaching: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
			below: 'bg-red-50 text-red-700 ring-red-600/20',

			// Training status variants
			notStarted: 'bg-gray-50 text-gray-700 ring-gray-600/20',
			expired: 'bg-red-50 text-red-700 ring-red-600/20',
			failed: 'bg-red-50 text-red-700 ring-red-600/20',

			// Employment type variants
			fullTime: 'bg-blue-50 text-blue-700 ring-blue-600/20',
			partTime: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
			contract: 'bg-orange-50 text-orange-700 ring-orange-600/20',
			intern: 'bg-purple-50 text-purple-700 ring-purple-600/20',
			consultant: 'bg-teal-50 text-teal-700 ring-teal-600/20'
		}
	},
	defaultVariants: {
		variant: 'pending'
	}
});

// Priority indicator variants
export const priorityVariants = tv({
	base: 'inline-flex items-center rounded px-2 py-1 text-xs font-medium',
	variants: {
		priority: {
			low: 'bg-blue-100 text-blue-800',
			medium: 'bg-yellow-100 text-yellow-800',
			high: 'bg-orange-100 text-orange-800',
			urgent: 'bg-red-100 text-red-800'
		}
	},
	defaultVariants: {
		priority: 'medium'
	}
});

// Employee avatar variants
export const employeeAvatarVariants = tv({
	base: 'inline-flex items-center justify-center rounded-full bg-gray-500 text-white font-medium',
	variants: {
		size: {
			sm: 'h-6 w-6 text-xs',
			md: 'h-8 w-8 text-sm',
			lg: 'h-10 w-10 text-base',
			xl: 'h-12 w-12 text-lg',
			'2xl': 'h-16 w-16 text-xl'
		}
	},
	defaultVariants: {
		size: 'md'
	}
});

// Department card variants
export const departmentCardVariants = tv({
	base: 'rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md',
	variants: {
		variant: {
			default: 'border-border',
			active: 'border-green-200 bg-green-50/50',
			inactive: 'border-gray-200 bg-gray-50/50 opacity-75'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});

// Data table action variants
export const tableActionVariants = tv({
	base: 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
	variants: {
		variant: {
			view: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
			edit: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
			delete: 'bg-red-100 text-red-700 hover:bg-red-200',
			approve: 'bg-green-100 text-green-700 hover:bg-green-200',
			reject: 'bg-red-100 text-red-700 hover:bg-red-200',
			download: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
		}
	},
	defaultVariants: {
		variant: 'view'
	}
});

// Form section variants
export const formSectionVariants = tv({
	base: 'space-y-4 rounded-lg border p-4',
	variants: {
		variant: {
			default: 'border-border',
			highlighted: 'border-blue-200 bg-blue-50/30',
			warning: 'border-yellow-200 bg-yellow-50/30',
			error: 'border-red-200 bg-red-50/30'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});

// Metric card variants for dashboards
export const metricCardVariants = tv({
	base: 'rounded-lg border bg-card p-6 shadow-sm',
	variants: {
		trend: {
			up: 'border-l-4 border-l-green-500',
			down: 'border-l-4 border-l-red-500',
			neutral: 'border-l-4 border-l-gray-300'
		}
	},
	defaultVariants: {
		trend: 'neutral'
	}
});

// Export types for TypeScript support
export type StatusBadgeVariants = VariantProps<typeof statusBadgeVariants>;
export type PriorityVariants = VariantProps<typeof priorityVariants>;
export type EmployeeAvatarVariants = VariantProps<typeof employeeAvatarVariants>;
export type DepartmentCardVariants = VariantProps<typeof departmentCardVariants>;
export type TableActionVariants = VariantProps<typeof tableActionVariants>;
export type FormSectionVariants = VariantProps<typeof formSectionVariants>;
export type MetricCardVariants = VariantProps<typeof metricCardVariants>;

// Utility functions for HR-specific formatting
export const formatEmployeeName = (employee: { displayName: string; email: string }) => {
	return employee.displayName || employee.email.split('@')[0];
};

export const formatPhoneNumber = (phone: string) => {
	const cleaned = phone.replace(/\D/g, '');
	if (cleaned.length === 10) {
		return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
	}
	return phone;
};

export const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount);
};

export const formatDuration = (hours: number) => {
	if (hours < 1) {
		return `${Math.round(hours * 60)}m`;
	}
	const wholeHours = Math.floor(hours);
	const minutes = Math.round((hours - wholeHours) * 60);
	if (minutes === 0) {
		return `${wholeHours}h`;
	}
	return `${wholeHours}h ${minutes}m`;
};

export const getInitials = (name: string) => {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
};

// Status mapping functions
export const getLeaveStatusVariant = (status: string): StatusBadgeVariants['variant'] => {
	const statusMap: Record<string, StatusBadgeVariants['variant']> = {
		Pending: 'pending',
		Approved: 'approved',
		Rejected: 'rejected',
		Cancelled: 'cancelled',
		InProgress: 'inProgress',
		Completed: 'completed'
	};
	return statusMap[status] || 'pending';
};

export const getAttendanceStatusVariant = (status: string): StatusBadgeVariants['variant'] => {
	const statusMap: Record<string, StatusBadgeVariants['variant']> = {
		Present: 'present',
		Absent: 'absent',
		Late: 'late',
		PartialDay: 'partialDay',
		Holiday: 'holiday',
		Vacation: 'vacation',
		Sick: 'sick'
	};
	return statusMap[status] || 'present';
};

export const getOnboardingStatusVariant = (status: string): StatusBadgeVariants['variant'] => {
	const statusMap: Record<string, StatusBadgeVariants['variant']> = {
		PreHire: 'preHire',
		Onboarding: 'onboarding',
		Active: 'active',
		Leave: 'leave',
		Terminated: 'terminated',
		Alumni: 'alumni'
	};
	return statusMap[status] || 'preHire';
};

export const getPerformanceRatingVariant = (rating: string): StatusBadgeVariants['variant'] => {
	const ratingMap: Record<string, StatusBadgeVariants['variant']> = {
		Exceeds: 'exceeds',
		Meets: 'meets',
		Approaching: 'approaching',
		Below: 'below'
	};
	return ratingMap[rating] || 'meets';
};

export const getTrainingStatusVariant = (status: string): StatusBadgeVariants['variant'] => {
	const statusMap: Record<string, StatusBadgeVariants['variant']> = {
		NotStarted: 'notStarted',
		InProgress: 'inProgress',
		Completed: 'completed',
		Expired: 'expired',
		Failed: 'failed'
	};
	return statusMap[status] || 'notStarted';
};

export const getEmploymentTypeVariant = (type: string): StatusBadgeVariants['variant'] => {
	const typeMap: Record<string, StatusBadgeVariants['variant']> = {
		FullTime: 'fullTime',
		PartTime: 'partTime',
		Contract: 'contract',
		Intern: 'intern',
		Consultant: 'consultant'
	};
	return typeMap[type] || 'fullTime';
};
