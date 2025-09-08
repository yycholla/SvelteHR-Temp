<script context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'UI/Progress',
		component: Progress,
		parameters: {
			layout: 'centered'
		},
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: { type: 'select' },
				options: ['default', 'success', 'warning', 'destructive']
			},
			size: {
				control: { type: 'select' },
				options: ['sm', 'default', 'lg']
			},
			value: {
				control: { type: 'range', min: 0, max: 100, step: 1 }
			}
		},
		args: {
			variant: 'default',
			size: 'default',
			value: 50
		}
	});
</script>

<script>
	import Progress from './progress.svelte';

	let progress1 = $state(0);
	let progress2 = $state(0);
	let interval1;
	let interval2;

	function startProgress1() {
		progress1 = 0;
		clearInterval(interval1);
		interval1 = setInterval(() => {
			if (progress1 >= 100) {
				clearInterval(interval1);
				return;
			}
			progress1 += Math.random() * 10;
			if (progress1 > 100) progress1 = 100;
		}, 200);
	}

	function startProgress2() {
		progress2 = 0;
		clearInterval(interval2);
		interval2 = setInterval(() => {
			if (progress2 >= 100) {
				clearInterval(interval2);
				return;
			}
			progress2 += 2;
		}, 100);
	}
</script>

<Story name="Default">
	<div class="w-80">
		<Progress value={60} />
	</div>
</Story>

<Story name="Variants">
	<div class="w-80 space-y-4">
		<div>
			<p class="mb-2 text-sm font-medium">Default (60%)</p>
			<Progress variant="default" value={60} />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium">Success (80%)</p>
			<Progress variant="success" value={80} />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium">Warning (40%)</p>
			<Progress variant="warning" value={40} />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium">Destructive (25%)</p>
			<Progress variant="destructive" value={25} />
		</div>
	</div>
</Story>

<Story name="Sizes">
	<div class="w-80 space-y-4">
		<div>
			<p class="mb-2 text-sm font-medium">Small</p>
			<Progress size="sm" value={70} />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium">Default</p>
			<Progress size="default" value={70} />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium">Large</p>
			<Progress size="lg" value={70} />
		</div>
	</div>
</Story>

<Story name="With Labels">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Downloading...</span>
				<span>45%</span>
			</div>
			<Progress value={45} />
		</div>

		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Upload Progress</span>
				<span>78 of 100 MB</span>
			</div>
			<Progress variant="success" value={78} />
		</div>

		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Installation</span>
				<span>Failed</span>
			</div>
			<Progress variant="destructive" value={15} />
		</div>
	</div>
</Story>

<Story name="Animated Progress">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Random Progress</span>
				<span>{Math.round(progress1)}%</span>
			</div>
			<Progress value={progress1} />
			<button
				onclick={startProgress1}
				class="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
			>
				Start Random
			</button>
		</div>

		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Smooth Progress</span>
				<span>{Math.round(progress2)}%</span>
			</div>
			<Progress variant="success" value={progress2} />
			<button onclick={startProgress2} class="rounded bg-green-600 px-3 py-1 text-xs text-white">
				Start Smooth
			</button>
		</div>
	</div>
</Story>

<Story name="Loading States">
	<div class="w-80 space-y-6">
		<div class="space-y-2">
			<h4 class="font-semibold">File Upload</h4>
			<div class="flex justify-between text-sm text-muted-foreground">
				<span>document.pdf</span>
				<span>2.4 MB</span>
			</div>
			<Progress value={100} variant="success" />
			<p class="text-xs text-green-600">✓ Upload complete</p>
		</div>

		<div class="space-y-2">
			<h4 class="font-semibold">Processing</h4>
			<div class="flex justify-between text-sm text-muted-foreground">
				<span>Analyzing data...</span>
				<span>45%</span>
			</div>
			<Progress value={45} />
			<p class="text-xs text-muted-foreground">Estimated 2 minutes remaining</p>
		</div>

		<div class="space-y-2">
			<h4 class="font-semibold">Installation Failed</h4>
			<div class="flex justify-between text-sm text-muted-foreground">
				<span>package-install.tar.gz</span>
				<span>Error</span>
			</div>
			<Progress value={25} variant="destructive" />
			<p class="text-xs text-destructive">✗ Installation failed at 25%</p>
		</div>
	</div>
</Story>

<Story name="Custom Max Value">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Custom Scale (max: 200)</span>
				<span>150 / 200</span>
			</div>
			<Progress value={150} max={200} />
		</div>

		<div class="space-y-2">
			<div class="flex justify-between text-sm">
				<span>Steps (max: 10)</span>
				<span>7 / 10 steps</span>
			</div>
			<Progress value={7} max={10} variant="success" />
		</div>
	</div>
</Story>

<Story name="Indeterminate">
	<div class="w-80 space-y-4">
		<div class="space-y-2">
			<p class="text-sm font-medium">Loading...</p>
			<Progress value={null} class="progress-indeterminate" />
			<p class="text-xs text-muted-foreground">Please wait while we process your request</p>
		</div>
	</div>
</Story>

<Story name="Playground" let:args>
	<div class="w-80 space-y-2">
		<div class="flex justify-between text-sm">
			<span>Progress</span>
			<span>{args.value}%</span>
		</div>
		<Progress {...args} />
	</div>
</Story>
