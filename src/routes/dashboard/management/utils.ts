import {
	Activity,
	AlertCircle,
	ArrowRight,
	Award,
	BarChart,
	Calendar,
	CheckCircle,
	Clock,
	FileText,
	MapPin,
	Plus,
	Target,
	TrendingUp,
	Users
} from '@lucide/svelte';

// Icon mapping for dynamic icons
export const iconMap = {
	Calendar,
	Award,
	Target,
	FileText,
	Users,
	Activity,
	Clock,
	BarChart
};

export function formatDate(dateString: string) {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'UTC'
	});
}

export function getProgressColor(value: number, target: number) {
	const percentage = (value / target) * 100;
	if (percentage >= 90) return 'green';
	if (percentage >= 70) return 'yellow';
	return 'red';
}

export function getAlertIcon(type: string) {
	switch (type) {
		case 'error':
			return AlertCircle;
		case 'warning':
			return AlertCircle;
		case 'info':
			return AlertCircle;
		default:
			return AlertCircle;
	}
}

export function getAlertColors(type: string) {
	switch (type) {
		case 'error':
			return {
				bg: 'bg-red-50',
				border: 'border-red-200',
				icon: 'text-red-500',
				title: 'text-red-900',
				message: 'text-red-700',
				button: 'bg-red-100 text-red-800 hover:bg-red-200'
			};
		case 'warning':
			return {
				bg: 'bg-yellow-50',
				border: 'border-yellow-200',
				icon: 'text-yellow-500',
				title: 'text-yellow-900',
				message: 'text-yellow-700',
				button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
			};
		case 'info':
			return {
				bg: 'bg-blue-50',
				border: 'border-blue-200',
				icon: 'text-blue-500',
				title: 'text-blue-900',
				message: 'text-blue-700',
				button: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
			};
		default:
			return {
				bg: 'bg-muted dark:bg-muted',
				border: 'border',
				icon: 'text-muted-foreground',
				title: 'text-foreground',
				message: 'text-foreground',
				button: 'bg-gray-100 text-foreground hover:bg-gray-200'
			};
	}
}
