<script lang="ts">
	import type { ComponentType } from 'svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

    interface Props {
        title: string;
        value: string | number;
        icon: ComponentType;
        trend?: {
            value: string;
            type: 'positive' | 'negative' | 'neutral' | 'warning';
        };
        tag?: string;
        href?: string;
        loading?: boolean;
        class?: string;
    }

    let { title, value, icon, trend, tag, href, loading = false, class: className = '' }: Props = $props();
    let Icon: ComponentType = icon;

	function getTrendClass(type: string): string {
		switch (type) {
			case 'positive': return 'text-green-600 bg-green-50';
			case 'negative': return 'text-red-600 bg-red-50';
			case 'warning': return 'text-yellow-600 bg-yellow-50';
			case 'neutral': return 'text-gray-600 bg-gray-50';
			default: return 'text-gray-600 bg-gray-50';
		}
	}

	function handleClick() {
		if (href) {
			window.location.href = href;
		}
	}
</script>

{#if href}
    <a class="stat-card clickable {className}" href={href}>
        <div class="stat-header">
            <div class="stat-info">
                <Icon class="stat-icon" size={20} />
                <div class="stat-text">
                    <h3 class="stat-title">{title}</h3>
                    {#if tag}
                        <Badge variant="outline" class="stat-tag">{tag}</Badge>
                    {/if}
                </div>
            </div>
        </div>

        <div class="stat-content">
            {#if loading}
                <div class="stat-skeleton">
                    <div class="skeleton-value"></div>
                    <div class="skeleton-trend"></div>
                </div>
            {:else}
                <div class="stat-value">{value}</div>
                {#if trend}
                    <div class="stat-trend {getTrendClass(trend.type)}">
                        {trend.value}
                    </div>
                {/if}
            {/if}
        </div>
    </a>
{:else}
    <div class="stat-card {className}">
	<div class="stat-header">
		<div class="stat-info">
                <Icon class="stat-icon" size={20} />
			<div class="stat-text">
				<h3 class="stat-title">{title}</h3>
				{#if tag}
					<Badge variant="outline" class="stat-tag">{tag}</Badge>
				{/if}
			</div>
		</div>
	</div>

	<div class="stat-content">
		{#if loading}
			<div class="stat-skeleton">
				<div class="skeleton-value"></div>
				<div class="skeleton-trend"></div>
			</div>
		{:else}
			<div class="stat-value">{value}</div>
			{#if trend}
				<div class="stat-trend {getTrendClass(trend.type)}">
					{trend.value}
				</div>
			{/if}
		{/if}
	</div>
    </div>
{/if}

<style>
	.stat-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		padding: 1.5rem;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.stat-card.clickable {
		cursor: pointer;
	}

	.stat-card.clickable:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.15);
		border-color: #d1d5db;
	}

	.stat-header {
		margin-bottom: 1rem;
	}

	.stat-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.stat-icon {
		color: #6366f1;
		flex-shrink: 0;
	}

	.stat-text {
		flex: 1;
	}

	.stat-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.25rem 0;
	}

	.stat-tag {
		background: #f0f9ff;
		color: #0369a1;
		border-color: #bae6fd;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1;
	}

	.stat-trend {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		display: inline-block;
		width: fit-content;
	}

	.stat-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-value {
		height: 2rem;
		background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		width: 80%;
	}

	.skeleton-trend {
		height: 0.75rem;
		background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
		width: 60%;
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}
</style>