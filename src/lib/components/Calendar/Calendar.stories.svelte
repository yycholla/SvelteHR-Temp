<script context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'UI/Calendar',
		component: Calendar,
		parameters: {
			layout: 'centered'
		},
		tags: ['autodocs'],
		args: {}
	});
</script>

<script>
	import Calendar from './Calendar.svelte';
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { getLocalTimeZone, today, isWeekend } from '@internationalized/date';

	let selectedDate = $state(today(getLocalTimeZone()));
	let rangeStart = $state(null);
	let rangeEnd = $state(null);

	const isDateUnavailable = (date) => {
		return date.day === 15 || date.day === 22 || date.day === 29;
	};

	const isWeekendDate = (date) => {
		return isWeekend(date, 'en-US');
	};
</script>

<Story name="Default">
	<Calendar />
</Story>

<Story name="With Selection">
	<div class="space-y-4">
		<CalendarPrimitive.Root
			class="inline-block rounded-lg border p-4"
			type="single"
			bind:value={selectedDate}
		>
			{#snippet children({ months, weekdays })}
				<CalendarPrimitive.Header class="mb-4 flex items-center justify-between">
					<CalendarPrimitive.PrevButton class="rounded p-2 hover:bg-muted">
						<span>←</span>
					</CalendarPrimitive.PrevButton>
					<CalendarPrimitive.Heading class="font-semibold" />
					<CalendarPrimitive.NextButton class="rounded p-2 hover:bg-muted">
						<span>→</span>
					</CalendarPrimitive.NextButton>
				</CalendarPrimitive.Header>

				{#each months as month}
					<CalendarPrimitive.Grid class="border-collapse">
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as day}
									<CalendarPrimitive.HeadCell
										class="h-10 w-10 text-center text-sm font-medium text-muted-foreground"
									>
										{day}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each month.weeks as weekDates}
								<CalendarPrimitive.GridRow class="flex">
									{#each weekDates as date}
										<CalendarPrimitive.Cell {date} month={month.value} class="h-10 w-10">
											<CalendarPrimitive.Day
												class="flex h-full w-full items-center justify-center rounded text-sm hover:bg-accent hover:text-accent-foreground data-[disabled]:opacity-50 data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground"
											/>
										</CalendarPrimitive.Cell>
									{/each}
								</CalendarPrimitive.GridRow>
							{/each}
						</CalendarPrimitive.GridBody>
					</CalendarPrimitive.Grid>
				{/each}
			{/snippet}
		</CalendarPrimitive.Root>

		<p class="text-sm text-muted-foreground">
			Selected: {selectedDate ? selectedDate.toString() : 'None'}
		</p>
	</div>
</Story>

<Story name="With Unavailable Dates">
	<div class="space-y-4">
		<CalendarPrimitive.Root
			class="inline-block rounded-lg border p-4"
			type="single"
			{isDateUnavailable}
		>
			{#snippet children({ months, weekdays })}
				<CalendarPrimitive.Header class="mb-4 flex items-center justify-between">
					<CalendarPrimitive.PrevButton class="rounded p-2 hover:bg-muted">
						<span>←</span>
					</CalendarPrimitive.PrevButton>
					<CalendarPrimitive.Heading class="font-semibold" />
					<CalendarPrimitive.NextButton class="rounded p-2 hover:bg-muted">
						<span>→</span>
					</CalendarPrimitive.NextButton>
				</CalendarPrimitive.Header>

				{#each months as month}
					<CalendarPrimitive.Grid class="border-collapse">
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as day}
									<CalendarPrimitive.HeadCell
										class="h-10 w-10 text-center text-sm font-medium text-muted-foreground"
									>
										{day}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each month.weeks as weekDates}
								<CalendarPrimitive.GridRow class="flex">
									{#each weekDates as date}
										<CalendarPrimitive.Cell {date} month={month.value} class="h-10 w-10">
											<CalendarPrimitive.Day
												class="flex h-full w-full items-center justify-center rounded text-sm hover:bg-accent hover:text-accent-foreground data-[disabled]:opacity-50 data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[unavailable]:line-through data-[unavailable]:opacity-25"
											/>
										</CalendarPrimitive.Cell>
									{/each}
								</CalendarPrimitive.GridRow>
							{/each}
						</CalendarPrimitive.GridBody>
					</CalendarPrimitive.Grid>
				{/each}
			{/snippet}
		</CalendarPrimitive.Root>

		<p class="text-sm text-muted-foreground">Dates 15, 22, and 29 are unavailable (crossed out)</p>
	</div>
</Story>

<Story name="Range Selection">
	<div class="space-y-4">
		<CalendarPrimitive.Root
			class="inline-block rounded-lg border p-4"
			type="range"
			bind:startValue={rangeStart}
			bind:endValue={rangeEnd}
		>
			{#snippet children({ months, weekdays })}
				<CalendarPrimitive.Header class="mb-4 flex items-center justify-between">
					<CalendarPrimitive.PrevButton class="rounded p-2 hover:bg-muted">
						<span>←</span>
					</CalendarPrimitive.PrevButton>
					<CalendarPrimitive.Heading class="font-semibold" />
					<CalendarPrimitive.NextButton class="rounded p-2 hover:bg-muted">
						<span>→</span>
					</CalendarPrimitive.NextButton>
				</CalendarPrimitive.Header>

				{#each months as month}
					<CalendarPrimitive.Grid class="border-collapse">
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as day}
									<CalendarPrimitive.HeadCell
										class="h-10 w-10 text-center text-sm font-medium text-muted-foreground"
									>
										{day}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each month.weeks as weekDates}
								<CalendarPrimitive.GridRow class="flex">
									{#each weekDates as date}
										<CalendarPrimitive.Cell {date} month={month.value} class="h-10 w-10">
											<CalendarPrimitive.Day
												class="flex h-full w-full items-center justify-center rounded text-sm hover:bg-accent hover:text-accent-foreground data-[outside-month]:text-muted-foreground/50 data-[range-end]:bg-primary data-[range-end]:text-primary-foreground data-[range-middle]:bg-accent data-[range-start]:bg-primary data-[range-start]:text-primary-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground"
											/>
										</CalendarPrimitive.Cell>
									{/each}
								</CalendarPrimitive.GridRow>
							{/each}
						</CalendarPrimitive.GridBody>
					</CalendarPrimitive.Grid>
				{/each}
			{/snippet}
		</CalendarPrimitive.Root>

		<div class="space-y-1 text-sm text-muted-foreground">
			<p>Start: {rangeStart ? rangeStart.toString() : 'Not selected'}</p>
			<p>End: {rangeEnd ? rangeEnd.toString() : 'Not selected'}</p>
			<p class="text-xs">Click and drag to select a date range</p>
		</div>
	</div>
</Story>

<Story name="Multiple Months">
	<CalendarPrimitive.Root
		class="inline-block rounded-lg border p-4"
		type="single"
		numberOfMonths={2}
	>
		{#snippet children({ months, weekdays })}
			<CalendarPrimitive.Header class="mb-4 flex items-center justify-between">
				<CalendarPrimitive.PrevButton class="rounded p-2 hover:bg-muted">
					<span>←</span>
				</CalendarPrimitive.PrevButton>
				<CalendarPrimitive.Heading class="font-semibold" />
				<CalendarPrimitive.NextButton class="rounded p-2 hover:bg-muted">
					<span>→</span>
				</CalendarPrimitive.NextButton>
			</CalendarPrimitive.Header>

			<div class="flex gap-8">
				{#each months as month}
					<CalendarPrimitive.Grid class="border-collapse">
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as day}
									<CalendarPrimitive.HeadCell
										class="h-10 w-10 text-center text-sm font-medium text-muted-foreground"
									>
										{day}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each month.weeks as weekDates}
								<CalendarPrimitive.GridRow class="flex">
									{#each weekDates as date}
										<CalendarPrimitive.Cell {date} month={month.value} class="h-10 w-10">
											<CalendarPrimitive.Day
												class="flex h-full w-full items-center justify-center rounded text-sm hover:bg-accent hover:text-accent-foreground data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground"
											/>
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
</Story>

<Story name="Compact Calendar">
	<CalendarPrimitive.Root class="inline-block rounded-lg border p-3" type="single">
		{#snippet children({ months, weekdays })}
			<CalendarPrimitive.Header class="mb-3 flex items-center justify-between">
				<CalendarPrimitive.PrevButton class="rounded p-1 text-sm hover:bg-muted">
					<span>‹</span>
				</CalendarPrimitive.PrevButton>
				<CalendarPrimitive.Heading class="text-sm font-medium" />
				<CalendarPrimitive.NextButton class="rounded p-1 text-sm hover:bg-muted">
					<span>›</span>
				</CalendarPrimitive.NextButton>
			</CalendarPrimitive.Header>

			{#each months as month}
				<CalendarPrimitive.Grid class="border-collapse">
					<CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridRow class="flex">
							{#each weekdays as day}
								<CalendarPrimitive.HeadCell
									class="h-6 w-8 text-center text-xs font-medium text-muted-foreground"
								>
									{day.slice(0, 1)}
								</CalendarPrimitive.HeadCell>
							{/each}
						</CalendarPrimitive.GridRow>
					</CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridBody>
						{#each month.weeks as weekDates}
							<CalendarPrimitive.GridRow class="flex">
								{#each weekDates as date}
									<CalendarPrimitive.Cell {date} month={month.value} class="h-8 w-8">
										<CalendarPrimitive.Day
											class="flex h-full w-full items-center justify-center rounded text-xs hover:bg-accent hover:text-accent-foreground data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground"
										/>
									</CalendarPrimitive.Cell>
								{/each}
							</CalendarPrimitive.GridRow>
						{/each}
					</CalendarPrimitive.GridBody>
				</CalendarPrimitive.Grid>
			{/each}
		{/snippet}
	</CalendarPrimitive.Root>
</Story>

<Story name="Event Calendar">
	<div class="space-y-4">
		<CalendarPrimitive.Root class="inline-block rounded-lg border p-4" type="single">
			{#snippet children({ months, weekdays })}
				<CalendarPrimitive.Header class="mb-4 flex items-center justify-between">
					<CalendarPrimitive.PrevButton class="rounded p-2 hover:bg-muted">
						<span>←</span>
					</CalendarPrimitive.PrevButton>
					<CalendarPrimitive.Heading class="font-semibold" />
					<CalendarPrimitive.NextButton class="rounded p-2 hover:bg-muted">
						<span>→</span>
					</CalendarPrimitive.NextButton>
				</CalendarPrimitive.Header>

				{#each months as month}
					<CalendarPrimitive.Grid class="border-collapse">
						<CalendarPrimitive.GridHead>
							<CalendarPrimitive.GridRow class="flex">
								{#each weekdays as day}
									<CalendarPrimitive.HeadCell
										class="h-10 w-12 text-center text-sm font-medium text-muted-foreground"
									>
										{day}
									</CalendarPrimitive.HeadCell>
								{/each}
							</CalendarPrimitive.GridRow>
						</CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridBody>
							{#each month.weeks as weekDates}
								<CalendarPrimitive.GridRow class="flex">
									{#each weekDates as date}
										<CalendarPrimitive.Cell {date} month={month.value} class="relative h-12 w-12">
											<CalendarPrimitive.Day
												class="relative flex h-full w-full flex-col items-center justify-center rounded text-sm hover:bg-accent hover:text-accent-foreground data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground"
											>
												{#if date.day === 5 || date.day === 12 || date.day === 18}
													<div
														class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-blue-500"
													></div>
												{/if}
												{#if date.day === 8 || date.day === 25}
													<div
														class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-red-500"
													></div>
												{/if}
											</CalendarPrimitive.Day>
										</CalendarPrimitive.Cell>
									{/each}
								</CalendarPrimitive.GridRow>
							{/each}
						</CalendarPrimitive.GridBody>
					</CalendarPrimitive.Grid>
				{/each}
			{/snippet}
		</CalendarPrimitive.Root>

		<div class="space-y-2 text-sm">
			<h4 class="font-medium">Legend:</h4>
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-blue-500"></div>
				<span class="text-muted-foreground">Meetings</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-red-500"></div>
				<span class="text-muted-foreground">Deadlines</span>
			</div>
		</div>
	</div>
</Story>
