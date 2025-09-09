<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { getLocalTimeZone, today } from '@internationalized/date';
	import { cn } from '$lib/utils';
	import type { DateValue } from '@internationalized/date';
	import type { ComponentProps } from 'svelte';

	interface CalendarProps extends ComponentProps<CalendarPrimitive.Root> {
		value?: DateValue | DateValue[];
		placeholder?: DateValue;
		multiple?: boolean;
		range?: boolean;
		class?: string;
		weekdayFormat?: 'narrow' | 'short' | 'long';
	}

	let {
		value = $bindable(),
		placeholder = $bindable(today(getLocalTimeZone())),
		multiple = false,
		range = false,
		class: className,
		weekdayFormat = 'short',
		...restProps
	}: CalendarProps = $props();

	// Determine calendar type based on props
	let calendarType: 'single' | 'multiple' = $derived(multiple ? 'multiple' : 'single');
</script>

<CalendarPrimitive.Root
	bind:value
	bind:placeholder
	type={calendarType}
	{weekdayFormat}
	fixedWeeks={true}
	class={cn(
		'rounded-2xl border border-border/40 bg-background/20 p-6 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl',
		className
	)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header class="mb-6 flex items-center justify-between">
			<CalendarPrimitive.PrevButton
				class="inline-flex size-12 items-center justify-center rounded-2xl border border-border/30 bg-background/30 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-background/50"
			>
				<ChevronLeft class="size-5 text-foreground" />
			</CalendarPrimitive.PrevButton>

			<CalendarPrimitive.Heading
				class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-2xl font-bold text-transparent"
			/>

			<CalendarPrimitive.NextButton
				class="inline-flex size-12 items-center justify-center rounded-2xl border border-border/30 bg-background/30 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-background/50"
			>
				<ChevronRight class="size-5 text-foreground" />
			</CalendarPrimitive.NextButton>
		</CalendarPrimitive.Header>

		<div class="flex flex-col space-y-6 sm:flex-row sm:space-y-0 sm:space-x-6">
			{#each months as month, i (i)}
				<CalendarPrimitive.Grid class="table w-full border-collapse select-none">
					<CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridRow class="mb-4 grid w-full grid-cols-7">
							{#each weekdays as day, i (i)}
								<CalendarPrimitive.HeadCell
									class="flex h-12 items-center justify-center rounded-xl text-sm font-semibold tracking-wide text-muted-foreground uppercase"
								>
									<div class="p-3">{day}</div>
								</CalendarPrimitive.HeadCell>
							{/each}
						</CalendarPrimitive.GridRow>
					</CalendarPrimitive.GridHead>

					<CalendarPrimitive.GridBody>
						{#each month.weeks as weekDates, i (i)}
							<CalendarPrimitive.GridRow class="grid w-full grid-cols-7">
								{#each weekDates as date, i (i)}
									<CalendarPrimitive.Cell
										{date}
										month={month.value}
										class="relative flex h-20 items-center justify-center p-0 text-center text-sm"
									>
										<CalendarPrimitive.Day
											class="group relative inline-flex size-14 items-center justify-center rounded-full border border-transparent bg-transparent text-sm font-medium whitespace-nowrap text-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/20 data-disabled:pointer-events-none data-disabled:text-foreground/30 data-outside-month:text-muted-foreground/50 data-outside-month:hover:text-muted-foreground data-selected:scale-105 data-selected:bg-primary data-selected:font-semibold data-selected:text-primary-foreground data-selected:shadow-lg data-unavailable:text-muted-foreground data-unavailable:line-through"
										>
											<!-- Today indicator dot -->
											<div
												class="absolute top-2 hidden size-1.5 rounded-full bg-primary shadow-sm group-data-selected:bg-primary-foreground group-data-today:block"
											></div>
											{date.day}
										</CalendarPrimitive.Day>
									</CalendarPrimitive.Cell>
								{/each}
							</CalendarPrimitive.GridRow>
						{/each}
					</CalendarPrimitive.GridBody>
				</CalendarPrimitive.Grid>
			{/each}
		</div>
	{/snippet}
</CalendarPrimitive.Root>
