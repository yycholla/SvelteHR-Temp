<script lang="ts">
	import type { ComponentType } from 'svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { AlertCircle } from 'lucide-svelte';

    interface Props {
        title: string;
        description: string;
        icon: ComponentType;
        tag?: string;
        href?: string;
        loading?: boolean;
        empty?: boolean;
        emptyMessage?: string;
        class?: string;
    }

    let { 
		title, 
		description, 
		icon, 
		tag, 
		href, 
		loading = false, 
		empty = false,
		emptyMessage = 'No data available',
		class: className = '',
		children
	}: Props = $props();
    let Icon: ComponentType = icon;

	function handleClick() {
		if (href) {
			window.location.href = href;
		}
	}
</script>

{#if href}
    <a class="block" href={href}>
        <Card class="streaming-card clickable {className}">
            <CardHeader class="streaming-card-header">
                <div class="card-title-section">
                    <Icon class="card-icon" size={20} />
                    <div class="title-content">
                        <CardTitle class="card-title">{title}</CardTitle>
                        {#if tag}
                            <Badge variant="outline" class="card-tag">{tag}</Badge>
                        {/if}
                    </div>
                </div>
            </CardHeader>
            <CardContent class="streaming-card-content">
                <CardDescription class="card-description">{description}</CardDescription>
                {#if loading}
                    <div class="loading-content">
                        {#each Array(3) as _}
                            <div class="skeleton-item">
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line short"></div>
                            </div>
                        {/each}
                    </div>
                {:else if empty}
                    <div class="empty-content">
                        <AlertCircle size={24} class="empty-icon" />
                        <p class="empty-text">{emptyMessage}</p>
                    </div>
                {:else}
                    <div class="card-content">
                        {@render children()}
                    </div>
                {/if}
            </CardContent>
        </Card>
    </a>
{:else}
    <Card class="streaming-card {className}">
        <CardHeader class="streaming-card-header">
            <div class="card-title-section">
                <Icon class="card-icon" size={20} />
                <div class="title-content">
                    <CardTitle class="card-title">{title}</CardTitle>
                    {#if tag}
                        <Badge variant="outline" class="card-tag">{tag}</Badge>
                    {/if}
                </div>
            </div>
        </CardHeader>
        <CardContent class="streaming-card-content">
            <CardDescription class="card-description">{description}</CardDescription>
            {#if loading}
                <div class="loading-content">
                    {#each Array(3) as _}
                        <div class="skeleton-item">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line short"></div>
                        </div>
                    {/each}
                </div>
            {:else if empty}
                <div class="empty-content">
                    <AlertCircle size={24} class="empty-icon" />
                    <p class="empty-text">{emptyMessage}</p>
                </div>
            {:else}
                <div class="card-content">
                    {@render children()}
                </div>
            {/if}
        </CardContent>
    </Card>
{/if}

<style>
	:global(.streaming-card) {
		transition: all 0.2s ease;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		background: white;
	}

	:global(.streaming-card.clickable) {
		cursor: pointer;
	}

	:global(.streaming-card.clickable:hover) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.15);
		border-color: #d1d5db;
	}

	:global(.streaming-card-header) {
		padding: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.card-title-section {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	:global(.card-icon) {
		color: #6366f1;
		flex-shrink: 0;
	}

	.title-content {
		flex: 1;
	}

	:global(.card-title) {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	:global(.card-tag) {
		background: #f0f9ff;
		color: #0369a1;
		border-color: #bae6fd;
		font-size: 0.75rem;
		font-weight: 500;
	}

	:global(.streaming-card-content) {
		padding: 1.5rem;
		padding-top: 1rem;
	}

	:global(.card-description) {
		color: #6b7280;
		font-size: 0.875rem;
		margin-bottom: 1.25rem;
		line-height: 1.5;
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-line {
		height: 16px;
		background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
		background-size: 200% 100%;
		animation: skeleton-loading 1.5s infinite;
		border-radius: 4px;
	}

	.skeleton-line.short {
		width: 60%;
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: #9ca3af;
		text-align: center;
	}

	.empty-icon {
		margin-bottom: 0.5rem;
	}

	.empty-text {
		font-size: 0.875rem;
	}

	.card-content {
		/* Content will be styled by the parent component */
	}

	@keyframes skeleton-loading {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.card-title-section {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>