<script context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'UI/Card',
		component: Card,
		parameters: {
			layout: 'centered'
		},
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: { type: 'select' },
				options: ['default', 'outline', 'ghost', 'elevated', 'interactive']
			},
			padding: {
				control: { type: 'select' },
				options: ['none', 'sm', 'md', 'lg']
			},
			state: {
				control: { type: 'select' },
				options: ['default', 'error', 'selected', 'disabled']
			},
			loading: {
				control: { type: 'boolean' }
			},
			clickable: {
				control: { type: 'boolean' }
			},
			elevated: {
				control: { type: 'boolean' }
			}
		},
		args: {
			variant: 'default',
			padding: 'md',
			state: 'default',
			loading: false,
			clickable: false,
			elevated: false
		}
	});
</script>

<script>
	import Card from './card.svelte';
	import CardHeader from './card-header.svelte';
	import CardTitle from './card-title.svelte';
	import CardDescription from './card-description.svelte';
	import CardContent from './card-content.svelte';
	import CardFooter from './card-footer.svelte';
	import Button from '../button/button.svelte';
	import Badge from '../badge/badge.svelte';
	import { BellRing, Check } from 'lucide-svelte';
</script>

<Story name="Default">
	<Card class="w-[350px]">
		<CardHeader>
			<CardTitle>Card Title</CardTitle>
			<CardDescription>Card description goes here</CardDescription>
		</CardHeader>
		<CardContent>
			<p>This is the main content of the card.</p>
		</CardContent>
		<CardFooter>
			<Button>Action</Button>
		</CardFooter>
	</Card>
</Story>

<Story name="Simple">
	<Card class="w-[350px]">
		<CardContent>
			<p>Simple card with just content.</p>
		</CardContent>
	</Card>
</Story>

<Story name="With Notification">
	<Card class="w-[380px]">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<BellRing class="h-5 w-5" />
				Notifications
			</CardTitle>
			<CardDescription>You have 3 unread messages.</CardDescription>
		</CardHeader>
		<CardContent class="grid gap-4">
			<div class="flex items-center space-x-4 rounded-md border p-4">
				<BellRing class="h-4 w-4" />
				<div class="flex-1 space-y-1">
					<p class="text-sm leading-none font-medium">Push Notifications</p>
					<p class="text-sm text-muted-foreground">Send notifications to device.</p>
				</div>
				<Badge variant="success">New</Badge>
			</div>
		</CardContent>
		<CardFooter>
			<Button class="w-full">
				<Check class="mr-2 h-4 w-4" /> Mark all as read
			</Button>
		</CardFooter>
	</Card>
</Story>

<Story name="Elevated">
	<Card class="w-[350px]" elevated>
		<CardHeader>
			<CardTitle>Elevated Card</CardTitle>
			<CardDescription>This card has elevation/shadow</CardDescription>
		</CardHeader>
		<CardContent>
			<p>Content with elevated appearance</p>
		</CardContent>
	</Card>
</Story>

<Story name="Clickable">
	<Card class="w-[350px]" clickable onclick={() => alert('Card clicked!')}>
		<CardHeader>
			<CardTitle>Clickable Card</CardTitle>
			<CardDescription>Click anywhere on this card</CardDescription>
		</CardHeader>
		<CardContent>
			<p>This entire card is clickable</p>
		</CardContent>
	</Card>
</Story>

<Story name="As Link">
	<Card class="w-[350px]" href="https://example.com" external>
		<CardHeader>
			<CardTitle>Link Card</CardTitle>
			<CardDescription>This card acts as a link</CardDescription>
		</CardHeader>
		<CardContent>
			<p>Click to navigate to external site</p>
		</CardContent>
	</Card>
</Story>

<Story name="Loading">
	<Card class="w-[350px]" loading>
		<CardHeader>
			<CardTitle>Loading Card</CardTitle>
			<CardDescription>Content is loading...</CardDescription>
		</CardHeader>
	</Card>
</Story>

<Story name="Error State">
	<Card class="w-[350px]" state="error">
		<CardHeader>
			<CardTitle>Error State</CardTitle>
			<CardDescription>Something went wrong</CardDescription>
		</CardHeader>
		<CardContent>
			<p>This card shows an error state</p>
		</CardContent>
	</Card>
</Story>

<Story name="Selected State">
	<Card class="w-[350px]" state="selected">
		<CardHeader>
			<CardTitle>Selected Card</CardTitle>
			<CardDescription>This card is currently selected</CardDescription>
		</CardHeader>
		<CardContent>
			<p>Selected state styling</p>
		</CardContent>
	</Card>
</Story>

<Story name="Disabled State">
	<Card class="w-[350px]" state="disabled">
		<CardHeader>
			<CardTitle>Disabled Card</CardTitle>
			<CardDescription>This card is disabled</CardDescription>
		</CardHeader>
		<CardContent>
			<p>Disabled card content</p>
		</CardContent>
		<CardFooter>
			<Button disabled>Disabled Action</Button>
		</CardFooter>
	</Card>
</Story>

<Story name="All Variants">
	<div class="grid grid-cols-2 gap-4">
		<Card class="w-[300px]" variant="default">
			<CardHeader>
				<CardTitle>Default</CardTitle>
				<CardDescription>Default variant</CardDescription>
			</CardHeader>
		</Card>

		<Card class="w-[300px]" variant="outline">
			<CardHeader>
				<CardTitle>Outline</CardTitle>
				<CardDescription>Outline variant</CardDescription>
			</CardHeader>
		</Card>

		<Card class="w-[300px]" variant="ghost">
			<CardHeader>
				<CardTitle>Ghost</CardTitle>
				<CardDescription>Ghost variant</CardDescription>
			</CardHeader>
		</Card>

		<Card class="w-[300px]" variant="elevated">
			<CardHeader>
				<CardTitle>Elevated</CardTitle>
				<CardDescription>Elevated variant</CardDescription>
			</CardHeader>
		</Card>
	</div>
</Story>
