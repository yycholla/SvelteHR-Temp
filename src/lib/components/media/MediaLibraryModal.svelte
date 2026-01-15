<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Upload, FileText, Image as ImageIcon, Video, Loader2 } from '@lucide/svelte';
	import { gql } from '@urql/core';
	import { client } from '$lib/graphql/client';
	import { env } from '$env/dynamic/public';

	interface Props {
		open: boolean;
		onSelect: (url: string, type: 'image' | 'video' | 'document') => void;
		onOpenChange: (open: boolean) => void;
		acceptedTypes?: 'image' | 'video' | 'document' | 'all';
	}

	let { open = $bindable(), onSelect, onOpenChange, acceptedTypes = 'all' }: Props = $props();

	let uploading = $state(false);
	let loading = $state(false);
	let assets = $state<any[]>([]);

	const MEDIA_ASSETS_QUERY = gql`
		query GetMediaAssets {
			mediaAssets {
				id
				filename
				storagePath
				mimeType
			}
		}
	`;

	async function loadAssets() {
		loading = true;
		const result = await client.query(MEDIA_ASSETS_QUERY, {}).toPromise();
		if (result.data) {
			assets = result.data.mediaAssets;
		}
		loading = false;
	}

	$effect(() => {
		if (open) {
			loadAssets();
		}
	});

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		uploading = true;
		const file = input.files[0];
		const formData = new FormData();
		formData.append('file', file);

		try {
			// Usually PUBLIC_API_URL is set, if not use fallback relative path or default
			const apiUrl = env.PUBLIC_API_URL || 'http://localhost:4000';
			const res = await fetch(`${apiUrl}/api/upload`, {
				method: 'POST',
				body: formData,
				// Credentials include cookie
				credentials: 'include'
			});

			if (res.ok) {
				await res.json();
				// Refresh list
				loadAssets();
			} else {
				console.error('Upload failed');
			}
		} catch (err) {
			console.error(err);
		} finally {
			uploading = false;
		}
	}

	function getIcon(mimeType: string) {
		if (mimeType.startsWith('image/')) return ImageIcon;
		if (mimeType.startsWith('video/')) return Video;
		return FileText;
	}

	function getType(mimeType: string): 'image' | 'video' | 'document' {
		if (mimeType.startsWith('image/')) return 'image';
		if (mimeType.startsWith('video/')) return 'video';
		return 'document';
	}

	function getUrl(path: string) {
		if (path.startsWith('http')) return path;
		const apiUrl = env.PUBLIC_API_URL || 'http://localhost:4000';
		const cleanPath = path.startsWith('/') ? path.substring(1) : path;
		return `${apiUrl}/${cleanPath}`;
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="max-w-3xl h-[600px] flex flex-col p-0 gap-0">
		<Dialog.Header class="p-6 border-b pb-4">
			<Dialog.Title>Media Library</Dialog.Title>
			<Dialog.Description>Select an asset or upload a new one.</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-hidden flex flex-col">
			<div class="p-4 border-b flex items-center justify-between bg-muted/5">
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" class="relative">
						{#if uploading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Uploading...
						{:else}
							<Upload class="mr-2 h-4 w-4" /> Upload New
						{/if}
						<input
							type="file"
							class="absolute inset-0 opacity-0 cursor-pointer"
							onchange={handleUpload}
							accept={acceptedTypes === 'image'
								? 'image/*'
								: acceptedTypes === 'video'
									? 'video/*'
									: '*/*'}
							disabled={uploading}
						/>
					</Button>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto p-6">
				{#if loading && assets.length === 0}
					<div class="flex items-center justify-center h-full">
						<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				{:else if assets.length > 0}
					<div class="grid grid-cols-4 gap-4">
						{#each assets as asset}
							{@const Icon = getIcon(asset.mimeType)}
							<button
								class="group relative border rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary flex flex-col items-center justify-center bg-muted/10 transition-all hover:bg-muted/20"
								onclick={() => onSelect(getUrl(asset.storagePath), getType(asset.mimeType))}
							>
								{#if getType(asset.mimeType) === 'image'}
									<img
										src={getUrl(asset.storagePath)}
										alt={asset.filename}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="flex flex-col items-center gap-2 text-muted-foreground">
										<Icon class="h-10 w-10" />
									</div>
								{/if}
								<div
									class="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur p-2 text-xs truncate border-t opacity-0 group-hover:opacity-100 transition-opacity"
								>
									{asset.filename}
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
						<p>No assets found.</p>
					</div>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
