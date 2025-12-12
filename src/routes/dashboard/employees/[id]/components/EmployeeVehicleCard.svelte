<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Car, Pencil, Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		employee: any;
		canManage: boolean;
		onAdd: () => void;
		onEdit: (vehicle: any) => void;
		onDelete: (vehicleId: string) => void;
	}

	const { employee, canManage, onAdd, onEdit, onDelete }: Props = $props();
</script>

<div class="flex flex-col rounded-xl border bg-card p-5">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2 text-muted-foreground">
			<Car class="h-4 w-4" />
			<span class="text-xs font-semibold uppercase tracking-wider">Vehicle</span>
		</div>
		{#if employee.vehicles?.length}
			<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
				>{employee.vehicles.length} Active</span
			>
		{/if}
		{#if canManage}
			<button
				onclick={onAdd}
				class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
			>
				<Plus class="h-3 w-3" />
			</button>
		{/if}
	</div>

	{#if employee.vehicles && employee.vehicles.length > 0}
		{#each employee.vehicles as vehicle}
			<div
				class="relative mt-auto overflow-hidden rounded-lg border bg-muted/30 p-4 transition-all hover:bg-muted/50"
			>
				<!-- Decorative Icon -->
				<Car class="absolute -right-4 -bottom-4 h-24 w-24 text-foreground/5" />

				<div class="relative z-10">
					<div class="mb-2 flex items-start justify-between">
						<div>
							<h4 class="text-lg font-bold text-foreground">
								{vehicle.make}
								{vehicle.model}
							</h4>
							<p class="text-xs text-muted-foreground">
								{vehicle.year} • {vehicle.color || 'No Color'}
							</p>
						</div>
						{#if canManage}
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6 hover:text-primary"
									onclick={() => onEdit(vehicle)}
								>
									<Pencil class="h-3.5 w-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-6 w-6 hover:text-destructive"
									onclick={() => onDelete(vehicle.id)}
								>
									<Trash2 class="h-3.5 w-3.5" />
								</Button>
							</div>
						{/if}
					</div>

					<div class="flex items-center justify-between">
						<Badge variant="outline" class="font-mono text-xs tracking-widest">
							{vehicle.licensePlate}
						</Badge>
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<div
			class="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5"
		>
			<Car class="mb-2 h-6 w-6 text-muted-foreground/40" />
			<p class="text-xs text-muted-foreground">No vehicle assigned</p>
		</div>
	{/if}
</div>
