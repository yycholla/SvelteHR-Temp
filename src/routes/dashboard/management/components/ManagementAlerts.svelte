<script lang="ts">
	import { AlertCircle } from '@lucide/svelte';

	interface Props {
		alerts: Array<{
			type: 'error' | 'warning' | 'info';
			title: string;
			message: string;
			action: string;
			href: string;
		}>;
	}

	const { alerts }: Props = $props();

	function getAlertIcon(type: string) {
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
	<div class="mb-6 grid grid-cols-1 gap-3">
		{#each alerts as alert}
			{@const colors = getAlertColors(alert.type)}
			{@const AlertIcon = getAlertIcon(alert.type)}
			<div class="flex items-center justify-between rounded-lg p-3 {colors.bg} {colors.border}">
				<div class="flex items-center gap-3">
					<AlertIcon class="h-5 w-5 {colors.icon}" />
					<div>
						<h4 class="font-medium {colors.title}">{alert.title}</h4>
						<p class="text-sm {colors.message}">{alert.message}</p>
					</div>
				</div>
				<a href={alert.href} class="rounded-md px-3 py-1 text-sm font-medium {colors.button}">
					{alert.action}
				</a>
			</div>
		{/each}
	</div>
{/if}
