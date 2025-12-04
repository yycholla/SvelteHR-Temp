<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		CheckCircle2,
		Circle,
		ChevronLeft,
		ChevronRight,
		PlayCircle,
		FileText,
		Image as ImageIcon,
		Link as LinkIcon,
		Menu,
		X
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import DOMPurify from 'isomorphic-dompurify';

	let { data } = $props();
	const { training, contents } = data;

	// State
	let activeIndex = $state(0);
	let progressData = $state(data.progress || []);
	let mobileMenuOpen = $state(false);

	// Derived
	let activeContent = $derived(contents && contents[activeIndex]);
	let activeIcon = $derived(activeContent ? getIcon(activeContent.type) : FileText);
	let completionPercentage = $derived(
		contents && contents.length > 0
			? Math.round(
					(progressData.filter((p: any) => p.status === 'COMPLETED').length / contents.length) * 100
				)
			: 0
	);

	function isCompleted(contentId: string) {
		return progressData.some(
			(p: any) => p.trainingContentId === contentId && p.status === 'COMPLETED'
		);
	}

	function handleNext() {
		if (contents && activeIndex < contents.length - 1) {
			activeIndex++;
		}
	}

	function handlePrevious() {
		if (contents && activeIndex > 0) {
			activeIndex--;
		}
	}

	function getIcon(type: string) {
		switch (type) {
			case 'VIDEO':
				return PlayCircle;
			case 'IMAGE':
				return ImageIcon;
			case 'URL':
				return LinkIcon;
			default:
				return FileText;
		}
	}

	// Extract YouTube video ID from various URL formats
	function getYouTubeVideoId(url: string): string | null {
		if (!url) return null;

		// Match youtube.com/watch?v=VIDEO_ID
		const watchMatch = url.match(/[?&]v=([^&#]+)/);
		if (watchMatch) return watchMatch[1];

		// Match youtu.be/VIDEO_ID
		const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
		if (shortMatch) return shortMatch[1];

		// Match youtube.com/embed/VIDEO_ID
		const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
		if (embedMatch) return embedMatch[1];

		return null;
	}
</script>

<svelte:head>
	<title>{training?.title || 'Training'} - Learning Module</title>
</svelte:head>

<div class="min-h-screen bg-background flex flex-col">
	<!-- Header -->
	<header class="border-b bg-card px-4 py-3 sticky top-0 z-10">
		<div class="container mx-auto max-w-7xl flex items-center justify-between gap-4">
			<div class="flex items-center gap-3 overflow-hidden">
				<Button variant="ghost" size="icon" href="/dashboard/training" class="shrink-0">
					<ChevronLeft class="h-5 w-5" />
				</Button>
				<div class="flex flex-col min-w-0">
					<h1 class="text-sm font-semibold truncate">{training?.title}</h1>
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<Progress value={completionPercentage} class="w-24 h-2" />
						<span>{completionPercentage}% Complete</span>
					</div>
				</div>
			</div>

			<Button
				variant="ghost"
				size="icon"
				class="lg:hidden"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
			>
				{#if mobileMenuOpen}
					<X class="h-5 w-5" />
				{:else}
					<Menu class="h-5 w-5" />
				{/if}
			</Button>
		</div>
	</header>

	<div class="flex-1 container mx-auto max-w-7xl p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Sidebar (Desktop) -->
		<div class="hidden lg:block lg:col-span-1 space-y-4">
			<Card.Root class="h-fit sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
				<Card.Header class="pb-3">
					<Card.Title class="text-lg">Course Content</Card.Title>
				</Card.Header>
				<Card.Content class="p-0">
					<div class="flex flex-col">
						{#each contents as content, i (content.id)}
							<button
								class={cn(
									'flex items-start gap-3 p-3 text-sm text-left transition-colors border-l-2',
									activeIndex === i
										? 'bg-accent border-l-primary font-medium'
										: 'hover:bg-muted/50 border-l-transparent text-muted-foreground'
								)}
								onclick={() => (activeIndex = i)}
							>
								<div class="mt-0.5 shrink-0">
									{#if isCompleted(content.id)}
										<CheckCircle2 class="h-4 w-4 text-green-600" />
									{:else}
										<Circle class="h-4 w-4 opacity-40" />
									{/if}
								</div>
								<div class="space-y-1">
									<span>{content.title}</span>
									<Badge variant="outline" class="text-[10px] px-1 py-0 h-4 font-normal opacity-70">
										{content.type.toLowerCase()}
									</Badge>
								</div>
							</button>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Mobile Menu (Sheet/Overlay equivalent) -->
		{#if mobileMenuOpen}
			<button
				type="button"
				class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden w-full border-none cursor-default"
				onclick={() => (mobileMenuOpen = false)}
				onkeydown={(e) => e.key === 'Escape' && (mobileMenuOpen = false)}
				aria-label="Close menu"
			></button>
			<div
				class="fixed inset-y-0 right-0 z-50 w-3/4 max-w-sm border-l bg-background shadow-lg p-4 lg:hidden transition-transform duration-300 ease-in-out overflow-y-auto"
			>
				<div class="flex items-center justify-between mb-6">
					<h2 class="font-semibold">Course Content</h2>
					<Button variant="ghost" size="icon" onclick={() => (mobileMenuOpen = false)}>
						<X class="h-5 w-5" />
					</Button>
				</div>
				<div class="flex flex-col space-y-1">
					{#each contents as content, i (content.id)}
						<button
							class={cn(
								'flex items-center gap-3 p-3 rounded-md text-sm text-left transition-colors',
								activeIndex === i ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
							)}
							onclick={() => {
								activeIndex = i;
								mobileMenuOpen = false;
							}}
						>
							{#if isCompleted(content.id)}
								<CheckCircle2 class="h-4 w-4 text-green-600 shrink-0" />
							{:else}
								<Circle class="h-4 w-4 text-muted-foreground shrink-0" />
							{/if}
							<span class="truncate">{content.title}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Main Content -->
		<div class="lg:col-span-3">
			{#if activeContent}
				{@const Icon = activeIcon}
				<Card.Root class="min-h-[600px] flex flex-col">
					<Card.Header>
						<div
							class="flex items-center gap-2 text-muted-foreground text-sm mb-2 uppercase tracking-wider font-medium"
						>
							<Icon class="h-4 w-4" />
							{activeContent.type}
						</div>
						<Card.Title class="text-2xl md:text-3xl">{activeContent.title}</Card.Title>
					</Card.Header>

					<Card.Content class="flex-1 space-y-6">
						<!-- Content Display based on Type -->
						{#if activeContent.type === 'TEXT'}
							<div class="prose prose-stone dark:prose-invert max-w-none">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html DOMPurify.sanitize(activeContent.data)}
							</div>
						{:else if activeContent.type == 'VIDEO'}
							{@const videoId = getYouTubeVideoId(activeContent.data)}
							{#if videoId}
								<!-- Embedded YouTube Video Player -->
								<div class="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
									<iframe
										src={`https://www.youtube.com/embed/${videoId}`}
										title={activeContent.title}
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										allowfullscreen
										class="w-full h-full"
									></iframe>
								</div>
							{:else}
								<!-- Fallback for non-YouTube videos or direct video files -->
								<div class="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-sm">
									{#if activeContent.data.match(/\.(mp4|webm|ogg)$/i)}
										<!-- Direct video file -->
										<video controls class="w-full h-full">
											<source src={activeContent.data} type="video/mp4" />
											<track kind="captions" />
											Your browser does not support the video tag.
										</video>
									{:else}
										<!-- External video link -->
										<div class="flex items-center justify-center h-full">
											<a
												href={activeContent.data}
												target="_blank"
												rel="noreferrer"
												class="flex flex-col items-center gap-4 text-white hover:scale-105 transition-transform"
											>
												<PlayCircle class="h-16 w-16" />
												<span class="font-semibold text-lg hover:underline">Open Video</span>
											</a>
										</div>
									{/if}
								</div>
							{/if}
							<p class="text-sm text-muted-foreground text-center mt-4">
								Source: <a
									href={activeContent.data}
									target="_blank"
									rel="noreferrer"
									class="underline text-primary hover:text-primary/80">{activeContent.data}</a
								>
							</p>
						{:else if activeContent.type === 'IMAGE'}
							<div class="rounded-lg overflow-hidden border bg-muted/10">
								<img
									src={activeContent.data}
									alt={activeContent.title}
									class="w-full h-auto max-h-[600px] object-contain mx-auto"
								/>
							</div>
						{:else if activeContent.type === 'URL' || activeContent.type === 'DOCUMENT'}
							<div
								class="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/5 text-center space-y-4"
							>
								<div
									class="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary"
								>
									{#if activeContent.type === 'DOCUMENT'}
										<FileText class="h-8 w-8" />
									{:else}
										<LinkIcon class="h-8 w-8" />
									{/if}
								</div>
								<div>
									<h3 class="text-lg font-semibold">External Content</h3>
									<p class="text-muted-foreground max-w-md mx-auto">
										This content is hosted externally. Please review it by clicking the link below.
									</p>
								</div>
								<Button
									href={activeContent.data}
									target="_blank"
									rel="noreferrer"
									variant="outline"
									class="gap-2"
								>
									Open {activeContent.type === 'DOCUMENT' ? 'Document' : 'Link'}
									<LinkIcon class="h-4 w-4" />
								</Button>
							</div>
						{/if}
					</Card.Content>

					<Card.Footer
						class="border-t p-6 flex flex-col sm:flex-row justify-between gap-4 items-center bg-muted/5"
					>
						<div class="flex gap-2 w-full sm:w-auto">
							<Button
								variant="outline"
								disabled={activeIndex === 0}
								onclick={handlePrevious}
								class="w-full sm:w-auto"
							>
								<ChevronLeft class="mr-2 h-4 w-4" /> Previous
							</Button>
							<Button
								variant="outline"
								disabled={!contents || activeIndex === contents.length - 1}
								onclick={handleNext}
								class="w-full sm:w-auto"
							>
								Next <ChevronRight class="ml-2 h-4 w-4" />
							</Button>
						</div>

						<form
							method="POST"
							action="?/completeContent"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										// Optimistically update progress
										progressData = [
											...progressData,
											{ trainingContentId: activeContent.id, status: 'COMPLETED' }
										];
										if (contents && activeIndex < contents.length - 1) {
											handleNext();
										}
									}
								};
							}}
							class="w-full sm:w-auto"
						>
							<input type="hidden" name="contentId" value={activeContent.id} />
							<Button
								type="submit"
								variant={isCompleted(activeContent.id) ? 'secondary' : 'default'}
								class="w-full sm:w-auto min-w-[200px]"
							>
								{#if isCompleted(activeContent.id)}
									<CheckCircle2 class="mr-2 h-4 w-4" /> Completed
								{:else}
									Mark as Complete
								{/if}
							</Button>
						</form>
					</Card.Footer>
				</Card.Root>
			{:else}
				<div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
					<p>No content available for this training module.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
