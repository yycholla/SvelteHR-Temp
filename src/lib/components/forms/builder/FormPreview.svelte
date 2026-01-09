<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { OnboardingForm, OnboardingFormBlock } from '$lib/graphql/form-operations';
	import { getBlockIcon } from './utils';

	interface Props {
		form: OnboardingForm;
		blocks: OnboardingFormBlock[];
	}

	let { form, blocks }: Props = $props();
</script>

<Card class="p-8">
	<div class="max-w-3xl mx-auto">
		<h2 class="text-2xl font-bold mb-2">{form.title}</h2>
		{#if form.description}
			<p class="text-gray-600 dark:text-gray-400 mb-6">{form.description}</p>
		{/if}

		<div class="space-y-6">
			{#each blocks as block}
				{@const BlockIcon = getBlockIcon(block.type)}
				<div class="border-l-4 border-blue-500 pl-4">
					<div class="flex items-center gap-2 mb-2">
						<BlockIcon class="w-5 h-5 text-blue-500" />
						{#if block.title}
							<h3 class="font-semibold">{block.title}</h3>
						{/if}
					</div>

					{#if block.type === 'TEXT' && block.textContent}
						<div class="prose dark:prose-invert">
							{block.textContent}
						</div>
					{:else if block.type === 'DOCUMENT' && block.documentUrl}
						<a
							href={block.documentUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 hover:underline"
						>
							View Document
						</a>
					{:else if block.type === 'FORM_FIELDS'}
						<p class="text-sm text-gray-500">Form fields will be rendered here</p>
					{:else if block.type === 'FILE_UPLOAD'}
						<p class="text-sm text-gray-500">File upload widget will be rendered here</p>
					{:else if block.type === 'SIGNATURE'}
						<p class="text-sm text-gray-500">Signature pad will be rendered here</p>
					{:else if block.type === 'CHECKBOX' && block.checkboxItems}
						<div class="space-y-2">
							{#each block.checkboxItems as item, i}
								<div class="flex items-center gap-2">
									<Checkbox id="checkbox-{block.id}-{i}" disabled />
									<label for="checkbox-{block.id}-{i}" class="text-sm">{item}</label>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</Card>
