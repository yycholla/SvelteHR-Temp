<script lang="ts">
	import { AlertCircle } from '@lucide/svelte';

	interface Props {
		goalsAnalytics: any;
	}

	const { goalsAnalytics }: Props = $props();

	// Alerts and notifications from server-side analytics
	const alerts = $derived([
		...(goalsAnalytics.summary.overdueGoals > 0
			? [
					{
						type: 'warning' as const,
						title: `${goalsAnalytics.summary.overdueGoals} Overdue Goals`,
						message: 'Some goals have passed their target date and need attention.',
						action: 'View Overdue Goals',
						href: '/dashboard/management/goals?status=overdue',
						testId: 'alert-overdue-goals'
					}
				]
			: []),
		...(goalsAnalytics.summary.atRiskGoals > 0
			? [
					{
						type: 'info' as const,
						title: `${goalsAnalytics.summary.atRiskGoals} At-Risk Goals`,
						message: 'These goals may not meet their deadlines without additional focus.',
						action: 'Review Goals',
						href: '/dashboard/management/goals?status=at-risk',
						testId: 'alert-at-risk-goals'
					}
				]
			: [])
	]);

	function getAlertColors(type: string) {
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
</script>

{#if alerts.length > 0}
	<div class="mb-8 space-y-4">
		{#each alerts as alert}
			{@const colors = getAlertColors(alert.type)}
			<div
				class={`flex items-start gap-4 rounded-lg border p-4 ${colors.bg} ${colors.border}`}
				data-testid={alert.testId}
			>
				<AlertCircle class={`mt-0.5 h-5 w-5 ${colors.icon}`} />
				<div class="flex-1">
					<h3 class={`text-sm font-medium ${colors.title}`}>{alert.title}</h3>
					<p class={`mt-1 text-sm ${colors.message}`}>{alert.message}</p>
				</div>
				<a
					href={alert.href}
					class={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${colors.button}`}
				>
					{alert.action}
				</a>
			</div>
		{/each}
	</div>
{/if}
