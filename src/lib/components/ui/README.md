# UI Component Library

A comprehensive collection of styled components built with bits-ui, Skeleton, and Tailwind CSS for your Svelte project.

## Available Components

### Layout & Structure

- **Card** - Container with header, content, and footer
- **Separator** - Visual divider component
- **Skeleton** - Loading placeholder components

### Form Components

- **Button** - Clickable button with variants
- **Input** - Text input field
- **Textarea** - Multi-line text input
- **Label** - Form field labels
- **Checkbox** - Checkbox with checked state
- **Radio Group** - Radio button selection
- **Switch** - Toggle switch component
- **Select** - Dropdown selection component

### Feedback & Status

- **Alert** - Notification messages with variants
- **Badge** - Status indicators and tags
- **Progress** - Progress bars with variants
- **Avatar** - User profile images with fallback

### Navigation & Interaction

- **Tabs** - Tabbed interface
- **Dialog** - Modal dialogs
- **Tooltip** - Hover tooltips

## Usage Examples

### Basic Card

```svelte
<script>
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
</script>

<Card>
	<CardHeader>
		<CardTitle>Card Title</CardTitle>
	</CardHeader>
	<CardContent>
		<p>This is the card content.</p>
	</CardContent>
</Card>
```

### Button Variants

```svelte
<script>
	import { Button } from '$lib/components/ui/button';
</script>

<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Alert Messages

```svelte
<script>
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
</script>

<Alert variant="default">
	<AlertTitle>Info</AlertTitle>
	<AlertDescription>This is an informational message.</AlertDescription>
</Alert>

<Alert variant="destructive">
	<AlertTitle>Error</AlertTitle>
	<AlertDescription>Something went wrong!</AlertDescription>
</Alert>
```

### Form Components

```svelte
<script>
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';

	let email = '';
	let agreedToTerms = false;
</script>

<div class="space-y-4">
	<div>
		<Label for="email">Email</Label>
		<Input id="email" type="email" bind:value={email} placeholder="Enter your email" />
	</div>

	<div class="flex items-center space-x-2">
		<Checkbox id="terms" bind:checked={agreedToTerms} />
		<Label for="terms">I agree to the terms and conditions</Label>
	</div>

	<Button type="submit">Submit</Button>
</div>
```

### Select Dropdown

```svelte
<script>
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
</script>

<Select>
	<SelectTrigger>
		<SelectValue placeholder="Select an option" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="option1">Option 1</SelectItem>
		<SelectItem value="option2">Option 2</SelectItem>
		<SelectItem value="option3">Option 3</SelectItem>
	</SelectContent>
</Select>
```

### Tabs Interface

```svelte
<script>
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
</script>

<Tabs value="tab1">
	<TabsList>
		<TabsTrigger value="tab1">Tab 1</TabsTrigger>
		<TabsTrigger value="tab2">Tab 2</TabsTrigger>
		<TabsTrigger value="tab3">Tab 3</TabsTrigger>
	</TabsList>

	<TabsContent value="tab1">
		<p>Content for tab 1</p>
	</TabsContent>

	<TabsContent value="tab2">
		<p>Content for tab 2</p>
	</TabsContent>

	<TabsContent value="tab3">
		<p>Content for tab 3</p>
	</TabsContent>
</Tabs>
```

## Styling

All components use your existing Tailwind CSS setup and design tokens defined in `app.css`. They support:

- **Dark mode** - Automatic theme switching
- **Custom variants** - Multiple visual styles per component
- **Size variants** - Different sizes (sm, default, lg)
- **Responsive design** - Mobile-first approach
- **Accessibility** - Built on bits-ui primitives

## Customization

Components can be customized by:

1. **CSS Classes** - Pass custom classes via the `class` prop
2. **CSS Variables** - Modify design tokens in `app.css`
3. **Tailwind Variants** - Edit variant definitions in component files
4. **Component Props** - Use built-in variant props

## TypeScript Support

All components are fully typed. Import types from individual component files:

```ts
import type { ButtonProps, ButtonVariant } from '$lib/components/ui/button';
import type { CardProps } from '$lib/components/ui/card';
```
