<script lang="ts">
	import { flip } from 'svelte/animate';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import {
		Type,
		Mail,
		Phone,
		AlignLeft,
		Hash,
		Calendar,
		List,
		CheckSquare,
		MessageSquare,
		Plus,
		Settings2,
		Eye,
		MousePointer2,
		GripVertical,
		Heading,
		Quote,
		Minus,
		Pilcrow,
		Layout,
		PenLine,
		ListTodo,
		Image as ImageIcon,
		Video,
		FileText,
		MonitorPlay
	} from '@lucide/svelte';
	import type { FormElement, FormFieldType } from '$lib/graphql/form-operations';
	import FormElementPreview from './FormElementPreview.svelte';
	import FormElementProperties from './FormElementProperties.svelte';

	interface Props {
		elements: FormElement[];
		onElementsChange: (elements: FormElement[]) => void;
	}

	let { elements = $bindable([]), onElementsChange }: Props = $props();

	// State
	let selectedIndex = $state<number | null>(null);
	let isPreviewMode = $state(false);

	// Drag & Drop Items
	type DndElement = FormElement & { id: string };
	let dndItems = $state<DndElement[]>([]);

	$effect(() => {
		dndItems = elements.map((el, i) => ({
			...el,
			id: (el as any).id || `el-${i}-${Date.now()}`
		}));
	});

	function handleDndConsider(e: CustomEvent<DndEvent<DndElement>>) {
		dndItems = e.detail.items as DndElement[];
	}

	function handleDndFinalize(e: CustomEvent<DndEvent<DndElement>>) {
		dndItems = e.detail.items as DndElement[];
		const newElements = dndItems.map(({ id, ...rest }) => rest as FormElement);
		onElementsChange(newElements);
	}

	function addElement(
		type:
			| FormFieldType
			| 'TEXT_BLOCK'
			| 'HEADER'
			| 'DIVIDER'
			| 'QUOTE'
			| 'MEDIA_IMAGE'
			| 'MEDIA_VIDEO'
			| 'MEDIA_DOCUMENT'
	) {
		let newElement: FormElement;

		if (type === 'TEXT_BLOCK') {
			newElement = {
				elementType: 'TEXT_BLOCK',
				content: 'Enter your text here...',
				style: 'plain'
			};
		} else if (type === 'HEADER') {
			newElement = {
				elementType: 'HEADER',
				content: 'New Section',
				level: 2
			};
		} else if (type === 'DIVIDER') {
			newElement = {
				elementType: 'DIVIDER'
			};
		} else if (type === 'QUOTE') {
			newElement = {
				elementType: 'QUOTE',
				content: 'Enter quote here...'
			};
		} else if (type === 'MEDIA_IMAGE') {
			newElement = {
				elementType: 'MEDIA',
				mediaType: 'image',
				url: '',
				altText: 'Image description'
			};
		} else if (type === 'MEDIA_VIDEO') {
			newElement = {
				elementType: 'MEDIA',
				mediaType: 'video',
				url: ''
			};
		} else if (type === 'MEDIA_DOCUMENT') {
			newElement = {
				elementType: 'MEDIA',
				mediaType: 'document',
				url: ''
			};
		} else {
			const count = elements.filter((e) => e.elementType === 'FIELD').length + 1;
			newElement = {
				elementType: 'FIELD',
				name: `field_${count}`,
				label: getLabel(type as FormFieldType),
				type: type as FormFieldType,
				required: false,
				placeholder: ''
			};
		}

		const newElements = [...elements, newElement];
		onElementsChange(newElements);
		selectedIndex = newElements.length - 1;
	}

	function updateElement(index: number, updated: FormElement) {
		const newElements = [...elements];
		newElements[index] = updated;
		onElementsChange(newElements);
	}

	function deleteElement(index: number) {
		const newElements = elements.filter((_, i) => i !== index);
		onElementsChange(newElements);
		if (selectedIndex === index) selectedIndex = null;
		if (selectedIndex !== null && selectedIndex > index) selectedIndex--;
	}

	function getLabel(type: string) {
		switch (type) {
			case 'TEXT':
				return 'Text Input';
			case 'EMAIL':
				return 'Email Address';
			case 'PHONE':
				return 'Phone Number';
			case 'TEXTAREA':
				return 'Long Text';
			case 'NUMBER':
				return 'Number';
			case 'DATE':
				return 'Date';
			case 'SELECT':
				return 'Dropdown';
			case 'CHECKBOX':
				return 'Checkbox';
			case 'TEXT_BLOCK':
				return 'Text Block';
			default:
				return 'Field';
		}
	}

	// Group tools into categories for the toolbar
	const toolGroups = [
		{
			id: 'typography',
			label: 'Typography',
			icon: Type,
			description: 'Headings, text blocks, and dividers',
			tools: [
				{ type: 'HEADER', label: 'Heading', icon: Heading, desc: 'H1, H2, H3 Titles' },
				{ type: 'TEXT_BLOCK', label: 'Paragraph', icon: MessageSquare, desc: 'Body text block' },
				{ type: 'QUOTE', label: 'Quote', icon: Quote, desc: 'Blockquote' },
				{ type: 'DIVIDER', label: 'Divider', icon: Minus, desc: 'Separator line' }
			]
		},
		{
			id: 'media',
			label: 'Media',
			icon: ImageIcon,
			description: 'Images, videos, and embedded documents',
			tools: [
				{ type: 'MEDIA_IMAGE', label: 'Image', icon: ImageIcon, desc: 'Upload or link image' },
				{ type: 'MEDIA_VIDEO', label: 'Video', icon: Video, desc: 'YouTube/Vimeo embed' },
				{ type: 'MEDIA_DOCUMENT', label: 'Document', icon: FileText, desc: 'PDF Viewer' }
			]
		},
		{
			id: 'inputs',
			label: 'Text Inputs',
			icon: PenLine,
			description: 'Basic text input fields',
			tools: [
				{ type: 'TEXT', label: 'Short Text', icon: Type, desc: 'Single line' },
				{ type: 'TEXTAREA', label: 'Long Text', icon: AlignLeft, desc: 'Multi-line' },
				{ type: 'EMAIL', label: 'Email', icon: Mail, desc: 'Email address' },
				{ type: 'PHONE', label: 'Phone', icon: Phone, desc: 'Phone number' }
			]
		},
		{
			id: 'data',
			label: 'Data & Choice',
			icon: ListTodo,
			description: 'Structured data and selections',
			tools: [
				{ type: 'NUMBER', label: 'Number', icon: Hash, desc: 'Numeric values' },
				{ type: 'DATE', label: 'Date', icon: Calendar, desc: 'Date picker' },
				{ type: 'SELECT', label: 'Dropdown', icon: List, desc: 'Select from list' },
				{ type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare, desc: 'Toggle option' }
			]
		}
	] as const;
</script>

<div class="flex h-full bg-muted/5 group/designer overflow-hidden">
	<!-- Left: Compact Toolbar -->
	<div class="w-16 bg-background border-r flex flex-col items-center py-4 gap-4 shrink-0 z-20">
		{#each toolGroups as group}
			<HoverCard.Root openDelay={0} closeDelay={100}>
				<HoverCard.Trigger
					class="h-10 w-10 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
				>
					<group.icon class="h-5 w-5" />
				</HoverCard.Trigger>
				<HoverCard.Content
					class="w-64 p-0 overflow-hidden"
					side="right"
					align="start"
					sideOffset={12}
				>
					<div class="px-4 py-3 bg-muted/30 border-b">
						<h4 class="font-semibold text-sm">{group.label}</h4>
						<p class="text-xs text-muted-foreground">{group.description}</p>
					</div>
					<div class="p-2 grid gap-1">
						{#each group.tools as tool}
							<button
								class="flex items-center gap-3 p-2 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left w-full group/btn"
								onclick={() => addElement(tool.type as any)}
							>
								<div
									class="h-8 w-8 rounded-sm bg-background border flex items-center justify-center text-muted-foreground group-hover/btn:border-primary/20 group-hover/btn:text-primary transition-colors"
								>
									<tool.icon class="h-4 w-4" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium leading-none">{tool.label}</div>
									<div class="text-[10px] text-muted-foreground mt-1 truncate">{tool.desc}</div>
								</div>
								<Plus class="h-3 w-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
							</button>
						{/each}
					</div>
				</HoverCard.Content>
			</HoverCard.Root>
		{/each}

		<div class="flex-1"></div>

		<Separator class="w-8 my-2" />

		<Tooltip.Root>
			<Tooltip.Trigger class="focus:outline-none">
				<div tabindex="0" role="button">
					<Badge
						variant="secondary"
						class="h-6 w-6 p-0 flex items-center justify-center rounded-full text-[10px]"
					>
						{elements.length}
					</Badge>
				</div>
			</Tooltip.Trigger>
			<Tooltip.Content side="right">
				<p>{elements.length} elements in form</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</div>

	<!-- Center: Canvas -->
	<div class="flex-1 flex flex-col relative min-w-0">
		<!-- Canvas Toolbar -->
		<div
			class="h-12 border-b bg-background/50 backdrop-blur flex items-center justify-between px-4 shrink-0"
		>
			<div class="flex items-center gap-2">
				<Button
					variant={!isPreviewMode ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 text-xs gap-2"
					onclick={() => (isPreviewMode = false)}
				>
					<MousePointer2 class="h-3.5 w-3.5" /> Edit
				</Button>
				<Button
					variant={isPreviewMode ? 'secondary' : 'ghost'}
					size="sm"
					class="h-8 text-xs gap-2"
					onclick={() => (isPreviewMode = true)}
				>
					<Eye class="h-3.5 w-3.5" /> Preview
				</Button>
			</div>

			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				{#if !isPreviewMode}
					<span>Click to edit • Drag to reorder</span>
				{/if}
			</div>
		</div>

		<!-- Canvas Area -->
		<div class="flex-1 overflow-y-auto bg-muted/20 p-8 flex justify-center">
			<div
				class="w-full max-w-3xl bg-background rounded-xl border shadow-sm min-h-[800px] h-fit flex flex-col transition-all duration-300 {isPreviewMode
					? 'ring-4 ring-offset-4 ring-muted'
					: ''}"
			>
				<!-- Form Header Simulation -->
				<div class="h-14 bg-muted/10 rounded-t-xl border-b mb-8 flex items-center px-6 gap-2">
					<!-- Fake window controls or branding -->
					<div class="h-3 w-3 rounded-full bg-border/60"></div>
					<div class="h-3 w-3 rounded-full bg-border/60"></div>
					<div class="flex-1"></div>
					<div class="h-4 w-32 rounded-full bg-border/30"></div>
				</div>

				<div class="px-12 pb-12 flex-1">
					{#if elements.length === 0}
						<div
							class="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-20"
						>
							<div class="bg-muted p-6 rounded-full mb-4">
								<Layout class="h-10 w-10" />
							</div>
							<p class="text-lg font-medium">Start Building</p>
							<p class="text-sm max-w-[200px] text-center mt-2">
								Hover over the tools on the left to add elements to your form.
							</p>
						</div>
					{:else}
						<div
							class="space-y-6 min-h-[200px]"
							use:dndzone={{
								items: dndItems,
								flipDurationMs: 200,
								dropTargetStyle: {
									outline: '2px solid hsl(var(--primary))',
									borderRadius: '0.5rem',
									opacity: '0.5'
								},
								dragDisabled: isPreviewMode
							}}
							onconsider={handleDndConsider}
							onfinalize={handleDndFinalize}
						>
							{#each dndItems as item, index (item.id)}
								<div animate:flip={{ duration: 200 }} class="relative group/item">
									<!-- Selection Wrapper -->
									<div
										class="relative rounded-lg transition-all duration-200
										{!isPreviewMode && selectedIndex === index
											? 'ring-2 ring-primary ring-offset-2 bg-accent/5'
											: !isPreviewMode
												? 'hover:bg-accent/5 border border-transparent hover:border-border/50'
												: ''}"
										onclick={(e) => {
											if (!isPreviewMode) {
												e.stopPropagation();
												selectedIndex = index;
											}
										}}
										role="button"
										tabindex="0"
										onkeydown={(e) =>
											e.key === 'Enter' && !isPreviewMode && (selectedIndex = index)}
									>
										<!-- Drag Handle (Left) -->
										{#if !isPreviewMode}
											<div
												class="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded cursor-move text-muted-foreground/40 hover:text-foreground opacity-0 group-hover/item:opacity-100 transition-opacity"
											>
												<GripVertical class="h-4 w-4" />
											</div>
										{/if}

										<div class="p-4 pointer-events-none">
											<!-- Disable interaction inside preview to prevent drag issues -->
											<FormElementPreview
												element={item}
												{index}
												onEdit={() => (selectedIndex = index)}
												onDelete={() => deleteElement(index)}
												readonly={true}
											/>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Right: Properties (Inspector) -->
	{#if !isPreviewMode && selectedIndex !== null && elements[selectedIndex]}
		<div
			class="w-80 bg-background border-l flex flex-col shrink-0 z-10 transition-all duration-300 slide-in-from-right-4"
		>
			<div class="p-4 border-b flex items-center justify-between bg-muted/10">
				<h3 class="font-semibold text-sm flex items-center gap-2">
					<Settings2 class="h-4 w-4" />
					Properties
				</h3>
				<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => (selectedIndex = null)}>
					<span class="sr-only">Close</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
					>
				</Button>
			</div>
			<ScrollArea class="flex-1">
				<div class="p-6">
					<FormElementProperties
						element={elements[selectedIndex]}
						onChange={(updated) => selectedIndex !== null && updateElement(selectedIndex, updated)}
					/>

					<Separator class="my-6" />

					<Button
						variant="destructive"
						class="w-full"
						onclick={() => selectedIndex !== null && deleteElement(selectedIndex)}
					>
						Delete Element
					</Button>
				</div>
			</ScrollArea>
		</div>
	{/if}
</div>
