<script context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'UI/Select',
		component: Select,
		parameters: {
			layout: 'centered'
		},
		tags: ['autodocs'],
		args: {}
	});
</script>

<script>
	import Select from './select.svelte';
	import SelectContent from './select-content.svelte';
	import SelectItem from './select-item.svelte';
	import SelectTrigger from './select-trigger.svelte';
	import SelectValue from './select-value.svelte';
	import Label from '../label/label.svelte';

	let fruit = $state('');
	let size = $state('');
	let theme = $state('');
</script>

<Story name="Default">
	<div class="w-80">
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="orange">Orange</SelectItem>
				<SelectItem value="grape">Grape</SelectItem>
			</SelectContent>
		</Select>
	</div>
</Story>

<Story name="With Label">
	<div class="w-80 space-y-2">
		<Label for="fruit-select">Choose your favorite fruit</Label>
		<Select>
			<SelectTrigger id="fruit-select">
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="orange">Orange</SelectItem>
				<SelectItem value="grape">Grape</SelectItem>
				<SelectItem value="mango">Mango</SelectItem>
				<SelectItem value="pineapple">Pineapple</SelectItem>
			</SelectContent>
		</Select>
	</div>
</Story>

<Story name="Sizes">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<Label>Small</Label>
			<Select>
				<SelectTrigger size="sm">
					<SelectValue placeholder="Small select" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
					<SelectItem value="option3">Option 3</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div class="space-y-2">
			<Label>Default</Label>
			<Select>
				<SelectTrigger size="default">
					<SelectValue placeholder="Default select" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
					<SelectItem value="option3">Option 3</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div class="space-y-2">
			<Label>Large</Label>
			<Select>
				<SelectTrigger size="lg">
					<SelectValue placeholder="Large select" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
					<SelectItem value="option3">Option 3</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</div>
</Story>

<Story name="Interactive">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<Label>Your selection</Label>
			<Select bind:value={fruit}>
				<SelectTrigger>
					<SelectValue placeholder="Choose a fruit" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="apple">🍎 Apple</SelectItem>
					<SelectItem value="banana">🍌 Banana</SelectItem>
					<SelectItem value="orange">🍊 Orange</SelectItem>
					<SelectItem value="grape">🍇 Grape</SelectItem>
					<SelectItem value="strawberry">🍓 Strawberry</SelectItem>
				</SelectContent>
			</Select>
		</div>

		{#if fruit}
			<div class="rounded bg-muted p-3">
				<p class="text-sm">You selected: <strong>{fruit}</strong></p>
			</div>
		{/if}
	</div>
</Story>

<Story name="Disabled">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<Label>Disabled select</Label>
			<Select>
				<SelectTrigger disabled>
					<SelectValue placeholder="This is disabled" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div class="space-y-2">
			<Label>With disabled options</Label>
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Some options disabled" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="available1">Available Option 1</SelectItem>
					<SelectItem value="disabled1" disabled>Disabled Option 1</SelectItem>
					<SelectItem value="available2">Available Option 2</SelectItem>
					<SelectItem value="disabled2" disabled>Disabled Option 2</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</div>
</Story>

<Story name="Form Example">
	<div class="w-96 space-y-4">
		<h3 class="text-lg font-semibold">Preferences</h3>

		<div class="space-y-2">
			<Label>T-shirt size</Label>
			<Select bind:value={size}>
				<SelectTrigger>
					<SelectValue placeholder="Select your size" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="xs">Extra Small (XS)</SelectItem>
					<SelectItem value="sm">Small (S)</SelectItem>
					<SelectItem value="md">Medium (M)</SelectItem>
					<SelectItem value="lg">Large (L)</SelectItem>
					<SelectItem value="xl">Extra Large (XL)</SelectItem>
					<SelectItem value="xxl">Extra Extra Large (XXL)</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div class="space-y-2">
			<Label>Theme preference</Label>
			<Select bind:value={theme}>
				<SelectTrigger>
					<SelectValue placeholder="Choose theme" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="light">🌞 Light</SelectItem>
					<SelectItem value="dark">🌙 Dark</SelectItem>
					<SelectItem value="system">💻 System</SelectItem>
				</SelectContent>
			</Select>
		</div>

		{#if size || theme}
			<div class="rounded-lg border bg-muted p-4">
				<h4 class="mb-2 font-medium">Summary</h4>
				<ul class="space-y-1 text-sm">
					{#if size}
						<li>Size: {size.toUpperCase()}</li>
					{/if}
					{#if theme}
						<li>Theme: {theme}</li>
					{/if}
				</ul>
			</div>
		{/if}
	</div>
</Story>

<Story name="Countries">
	<div class="w-80 space-y-2">
		<Label>Select country</Label>
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Choose a country" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="us">🇺🇸 United States</SelectItem>
				<SelectItem value="ca">🇨🇦 Canada</SelectItem>
				<SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
				<SelectItem value="au">🇦🇺 Australia</SelectItem>
				<SelectItem value="de">🇩🇪 Germany</SelectItem>
				<SelectItem value="fr">🇫🇷 France</SelectItem>
				<SelectItem value="es">🇪🇸 Spain</SelectItem>
				<SelectItem value="it">🇮🇹 Italy</SelectItem>
				<SelectItem value="jp">🇯🇵 Japan</SelectItem>
				<SelectItem value="kr">🇰🇷 South Korea</SelectItem>
				<SelectItem value="cn">🇨🇳 China</SelectItem>
				<SelectItem value="in">🇮🇳 India</SelectItem>
				<SelectItem value="br">🇧🇷 Brazil</SelectItem>
				<SelectItem value="mx">🇲🇽 Mexico</SelectItem>
			</SelectContent>
		</Select>
	</div>
</Story>

<Story name="Long Options">
	<div class="w-80 space-y-2">
		<Label>Programming languages</Label>
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Select a programming language" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="javascript">JavaScript - Dynamic web development language</SelectItem>
				<SelectItem value="typescript">TypeScript - JavaScript with type safety</SelectItem>
				<SelectItem value="python">Python - General-purpose programming language</SelectItem>
				<SelectItem value="java">Java - Object-oriented programming language</SelectItem>
				<SelectItem value="csharp">C# - Microsoft's object-oriented language</SelectItem>
				<SelectItem value="cpp">C++ - System programming language</SelectItem>
				<SelectItem value="rust">Rust - Memory-safe systems programming</SelectItem>
				<SelectItem value="go">Go - Fast compilation and execution</SelectItem>
				<SelectItem value="swift">Swift - Apple's programming language</SelectItem>
				<SelectItem value="kotlin">Kotlin - Modern Android development</SelectItem>
			</SelectContent>
		</Select>
	</div>
</Story>

<Story name="Grouped Options">
	<div class="w-80 space-y-2">
		<Label>Select technology</Label>
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Choose a technology" />
			</SelectTrigger>
			<SelectContent>
				<div class="px-2 py-1 text-xs font-medium text-muted-foreground">Frontend</div>
				<SelectItem value="react">React</SelectItem>
				<SelectItem value="vue">Vue.js</SelectItem>
				<SelectItem value="angular">Angular</SelectItem>
				<SelectItem value="svelte">Svelte</SelectItem>

				<div class="mt-1 border-t px-2 py-1 pt-2 text-xs font-medium text-muted-foreground">
					Backend
				</div>
				<SelectItem value="nodejs">Node.js</SelectItem>
				<SelectItem value="python">Python</SelectItem>
				<SelectItem value="java">Java</SelectItem>
				<SelectItem value="go">Go</SelectItem>

				<div class="mt-1 border-t px-2 py-1 pt-2 text-xs font-medium text-muted-foreground">
					Database
				</div>
				<SelectItem value="postgresql">PostgreSQL</SelectItem>
				<SelectItem value="mysql">MySQL</SelectItem>
				<SelectItem value="mongodb">MongoDB</SelectItem>
				<SelectItem value="redis">Redis</SelectItem>
			</SelectContent>
		</Select>
	</div>
</Story>

<Story name="Search Select">
	<div class="w-80 space-y-2">
		<Label>Search and select</Label>
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Type to search..." />
			</SelectTrigger>
			<SelectContent>
				<div class="p-2">
					<input
						type="text"
						placeholder="Search options..."
						class="w-full rounded border px-2 py-1 text-sm"
					/>
				</div>
				<SelectItem value="option1">First Option</SelectItem>
				<SelectItem value="option2">Second Option</SelectItem>
				<SelectItem value="option3">Third Option</SelectItem>
				<SelectItem value="option4">Fourth Option</SelectItem>
				<SelectItem value="option5">Fifth Option</SelectItem>
			</SelectContent>
		</Select>
	</div>
</Story>
