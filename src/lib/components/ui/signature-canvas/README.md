# SignatureCanvas Component

A production-ready HTML5 Canvas-based signature capture component for Svelte 5.

## Features

- ✅ **Mouse and Touch Support** - Works on desktop and mobile devices
- ✅ **Clear/Reset Functionality** - Easy signature reset
- ✅ **Base64 PNG Export** - Export signatures as data URLs
- ✅ **Responsive Scaling** - Canvas scales to container width
- ✅ **Configurable Styling** - Customize pen color, width, and background
- ✅ **Form Integration** - Includes `SignatureField` wrapper for forms
- ✅ **Validation Support** - Required field indication and error handling
- ✅ **Svelte 5 Runes** - Modern reactive syntax with `$state`, `$derived`, `$bindable`

## Components

### `SignatureCanvas.svelte`

The core signature capture component.

### `SignatureField.svelte`

Form field wrapper with label, description, and validation.

## Basic Usage

### Standalone Canvas

```svelte
<script>
	import { SignatureCanvas } from '$lib/components/ui/signature-canvas';

	let signatureData = $state(null);

	function handleSignatureChange(signature) {
		signatureData = signature;
		console.log('Signature captured:', signature);
	}
</script>

<SignatureCanvas
	width={400}
	height={150}
	onSignatureChange={handleSignatureChange}
/>
```

### Form Field Integration

```svelte
<script>
	import { SignatureField } from '$lib/components/ui/signature-canvas';

	let signature = $state(null);
	let error = $state(null);

	function handleSubmit() {
		if (!signature) {
			error = 'Signature is required';
			return;
		}

		// Submit signature
		console.log('Submitting signature:', signature);
	}
</script>

<form onsubmit={handleSubmit}>
	<SignatureField
		name="employee_signature"
		label="Employee Signature"
		description="Please sign using your mouse or finger"
		required={true}
		bind:value={signature}
		{error}
	/>

	<button type="submit">Submit</button>
</form>
```

## Props

### SignatureCanvas Props

| Prop                | Type                                  | Default       | Description                     |
| ------------------- | ------------------------------------- | ------------- | ------------------------------- |
| `width`             | `number`                              | `400`         | Canvas width in pixels          |
| `height`            | `number`                              | `150`         | Canvas height in pixels         |
| `penColor`          | `string`                              | `'#000000'`   | Pen stroke color                |
| `penWidth`          | `number`                              | `2`           | Pen stroke width                |
| `backgroundColor`   | `string`                              | `'#ffffff'`   | Canvas background color         |
| `placeholder`       | `string`                              | `'Sign here'` | Placeholder text when empty     |
| `required`          | `boolean`                             | `false`       | Show required indicator         |
| `disabled`          | `boolean`                             | `false`       | Disable signature capture       |
| `class`             | `string`                              | `''`          | Additional CSS classes          |
| `onSignatureChange` | `(signature: string \| null) => void` | `undefined`   | Callback when signature changes |

### SignatureField Props

All `SignatureCanvas` props, plus:

| Prop          | Type                        | Default      | Description              |
| ------------- | --------------------------- | ------------ | ------------------------ |
| `name`        | `string`                    | **required** | Form field name          |
| `label`       | `string`                    | **required** | Field label              |
| `description` | `string`                    | `undefined`  | Help text                |
| `error`       | `string`                    | `undefined`  | Validation error message |
| `value`       | `string \| null` (bindable) | `null`       | Signature data URL       |

## Public API

Both components expose methods for programmatic control:

### Methods

```typescript
// Clear the signature
clear(): void

// Get signature as base64 PNG data URL
getSignature(): string | null

// Check if signature is empty
isSignatureEmpty(): boolean
```

### Usage Example

```svelte
<script>
	import { SignatureCanvas } from '$lib/components/ui/signature-canvas';

	let signatureCanvas;

	function handleClear() {
		signatureCanvas.clear();
	}

	function handleSave() {
		const signature = signatureCanvas.getSignature();
		if (signature) {
			console.log('Saving signature:', signature);
		}
	}

	function handleValidate() {
		if (signatureCanvas.isSignatureEmpty()) {
			alert('Please provide a signature');
		}
	}
</script>

<SignatureCanvas bind:this={signatureCanvas} />

<button onclick={handleClear}>Clear</button>
<button onclick={handleSave}>Save</button>
<button onclick={handleValidate}>Validate</button>
```

## Advanced Usage

### Custom Styling

```svelte
<SignatureCanvas
	width={500}
	height={200}
	penColor="#0066cc"
	penWidth={3}
	backgroundColor="#f5f5f5"
	placeholder="Draw your signature here"
	class="shadow-lg"
/>
```

### W-4 Form Integration

```svelte
<script>
	import { SignatureField } from '$lib/components/ui/signature-canvas';

	let formData = $state({
		employee_signature: null,
		signature_date: new Date().toISOString().split('T')[0]
	});

	let errors = $state({});

	function validateAndSubmit() {
		errors = {};

		if (!formData.employee_signature) {
			errors.employee_signature = 'Employee signature is required';
			return;
		}

		// Submit W-4 form with signature
		submitW4Form(formData);
	}
</script>

<div class="space-y-4">
	<SignatureField
		name="employee_signature"
		label="Employee Signature"
		description="Under penalties of perjury, I declare that this certificate is true, correct, and complete."
		required={true}
		bind:value={formData.employee_signature}
		error={errors.employee_signature}
		width={400}
		height={150}
	/>

	<div class="flex gap-2">
		<label>
			Date:
			<input
				type="date"
				bind:value={formData.signature_date}
				required
			/>
		</label>
	</div>

	<button onclick={validateAndSubmit}>
		Submit W-4 Form
	</button>
</div>
```

### Onboarding Flow Integration

```svelte
<script>
	import { SignatureField } from '$lib/components/ui/signature-canvas';
	import { onboardingProgress } from '$lib/stores/onboarding';

	let signature = $state(null);
	let signatureField;

	async function handleNext() {
		// Validate signature
		if (signatureField.isEmpty()) {
			alert('Please provide your signature before continuing');
			return;
		}

		// Save signature to onboarding progress
		await onboardingProgress.saveSignature({
			contentBlockId: 'uuid-of-signature-block',
			signatureData: signature,
			signedAt: new Date().toISOString(),
			ipAddress: await getClientIP()
		});

		// Move to next step
		goto('/onboarding/next-step');
	}
</script>

<SignatureField
	bind:this={signatureField}
	name="onboarding_signature"
	label="Sign to Acknowledge"
	description="By signing, you acknowledge that you have read and understood the company policies."
	required={true}
	bind:value={signature}
/>

<button onclick={handleNext}>Continue</button>
```

## Data Format

Signatures are exported as base64-encoded PNG data URLs:

```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

### Storing Signatures

When submitting to the backend:

```typescript
const formSubmission = {
	content_block_id: 'uuid',
	form_data: {
		employee_signature: {
			data: signatureCanvas.getSignature(), // base64 PNG
			signed_at: new Date().toISOString(),
			ip_address: '192.168.1.1'
		}
	}
};
```

### Displaying Saved Signatures

```svelte
<script>
	let savedSignature = 'data:image/png;base64,...';
</script>

<div class="border-2 border-gray-300 rounded-lg p-4">
	<img src={savedSignature} alt="Employee Signature" class="max-w-full h-auto" />
	<p class="text-xs text-gray-500 mt-2">
		Signed on {new Date(signedAt).toLocaleDateString()}
	</p>
</div>
```

## Accessibility

- ✅ Keyboard navigation support (focus on canvas)
- ✅ ARIA labels for screen readers
- ✅ Required field indication
- ✅ Error message association
- ✅ Touch-friendly for mobile devices

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android)

## Performance

- Canvas rendering is optimized with `willReadFrequently: false`
- Touch events use `preventDefault()` to avoid scrolling
- `touch-none` class prevents native touch gestures
- Event listeners cleaned up on component destroy

## Testing

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import SignatureCanvas from './SignatureCanvas.svelte';

test('captures signature on mouse draw', async () => {
	const { container } = render(SignatureCanvas);
	const canvas = container.querySelector('canvas');

	// Simulate drawing
	await fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
	await fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
	await fireEvent.mouseUp(canvas);

	// Check signature captured
	const signature = canvas.toDataURL('image/png');
	expect(signature).toMatch(/^data:image\/png;base64,/);
});

test('clears signature', async () => {
	const { container, component } = render(SignatureCanvas);

	// Draw signature
	// ... (draw code)

	// Clear
	await component.clear();

	// Verify empty
	expect(component.isSignatureEmpty()).toBe(true);
});
```

## Related Components

- `Button` - Used for clear action
- `Card` - Container wrapper
- `Label` - Form labels in SignatureField

## Migration from Other Libraries

### From `react-signature-canvas`:

```diff
- <SignatureCanvas ref={sigCanvas} />
+ <SignatureCanvas bind:this={sigCanvas} />

- sigCanvas.clear()
+ sigCanvas.clear()

- sigCanvas.toDataURL('image/png')
+ sigCanvas.getSignature()
```

### From `signature_pad`:

```diff
- const signaturePad = new SignaturePad(canvas);
+ <SignatureCanvas bind:this={signatureCanvas} />

- signaturePad.clear();
+ signatureCanvas.clear();

- signaturePad.toDataURL();
+ signatureCanvas.getSignature();

- signaturePad.isEmpty();
+ signatureCanvas.isSignatureEmpty();
```
