<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Pencil, Phone, Plus, ShieldAlert, Trash2 } from '@lucide/svelte';

	interface Props {
		employee: any;
		canManage: boolean;
		onAdd: () => void;
		onEdit: (contact: any) => void;
		onDelete: (contactId: string) => void;
	}

	const { employee, canManage, onAdd, onEdit, onDelete }: Props = $props();
</script>

<div class="flex flex-col rounded-xl border bg-card p-5 md:row-span-2">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2 text-muted-foreground">
			<ShieldAlert class="h-4 w-4" />
			<span class="text-xs font-semibold uppercase tracking-wider">Emergency</span>
		</div>
		{#if canManage}
			<button
				onclick={onAdd}
				class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
			>
				<Plus class="h-3 w-3" />
			</button>
		{/if}
	</div>

	<div class="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
		{#if employee.emergencyContacts && employee.emergencyContacts.length > 0}
			{#each employee.emergencyContacts as contact}
				<div
					class="group relative rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40 min-h-[70px]"
				>
					<div class="mb-1 flex items-start justify-between">
						<p class="text-sm font-medium">{contact.name}</p>
						{#if contact.relationship}
							<span
								class="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
							>
								{contact.relationship}
							</span>
						{/if}
					</div>
					<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
						<Phone class="h-3 w-3" />
						<span>{contact.phoneNumber}</span>
					</div>

					{#if canManage}
						<div class="absolute bottom-2 right-2 hidden gap-1 group-hover:flex">
							<Button
								variant="ghost"
								size="icon"
								class="h-6 w-6 hover:text-primary"
								onclick={() => onEdit(contact)}
							>
								<Pencil class="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-6 w-6 hover:text-destructive"
								onclick={() => onDelete(contact.id)}
							>
								<Trash2 class="h-3.5 w-3.5" />
							</Button>
						</div>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="flex h-full items-center justify-center text-center">
				<p class="text-xs text-muted-foreground">No emergency contacts</p>
			</div>
		{/if}
	</div>
</div>