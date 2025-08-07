<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/RadioGroup',
    component: RadioGroup,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      orientation: {
        control: { type: 'select' },
        options: ['vertical', 'horizontal'],
      },
    },
    args: {
      orientation: 'vertical',
    },
  });
</script>

<script>
  import RadioGroup from './radio-group.svelte';
  import RadioGroupItem from './radio-group-item.svelte';
  import Label from '../label/label.svelte';
  import Card from '../card/card.svelte';
  import CardHeader from '../card/card-header.svelte';
  import CardTitle from '../card/card-title.svelte';
  import CardContent from '../card/card-content.svelte';
  
  let paymentMethod = $state('card');
  let size = $state('medium');
  let theme = $state('light');
  let plan = $state('');
</script>

<Story name="Default">
  <RadioGroup value="comfortable">
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="default" id="r1" />
      <Label for="r1">Default</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="comfortable" id="r2" />
      <Label for="r2">Comfortable</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="compact" id="r3" />
      <Label for="r3">Compact</Label>
    </div>
  </RadioGroup>
</Story>

<Story name="Horizontal">
  <RadioGroup orientation="horizontal" value="card">
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="card" id="h1" />
      <Label for="h1">Card</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="paypal" id="h2" />
      <Label for="h2">PayPal</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="apple" id="h3" />
      <Label for="h3">Apple Pay</Label>
    </div>
  </RadioGroup>
</Story>

<Story name="With Descriptions">
  <RadioGroup value="comfortable" class="max-w-md">
    <div class="flex items-start space-x-3">
      <RadioGroupItem value="default" id="d1" class="mt-1" />
      <div class="space-y-1">
        <Label for="d1">Default</Label>
        <p class="text-sm text-muted-foreground">
          Use the default spacing for lists and content.
        </p>
      </div>
    </div>
    <div class="flex items-start space-x-3">
      <RadioGroupItem value="comfortable" id="d2" class="mt-1" />
      <div class="space-y-1">
        <Label for="d2">Comfortable</Label>
        <p class="text-sm text-muted-foreground">
          Increase spacing for better readability.
        </p>
      </div>
    </div>
    <div class="flex items-start space-x-3">
      <RadioGroupItem value="compact" id="d3" class="mt-1" />
      <div class="space-y-1">
        <Label for="d3">Compact</Label>
        <p class="text-sm text-muted-foreground">
          Reduce spacing to fit more content.
        </p>
      </div>
    </div>
  </RadioGroup>
</Story>

<Story name="Payment Method">
  <Card class="w-80">
    <CardHeader>
      <CardTitle>Payment Method</CardTitle>
    </CardHeader>
    <CardContent>
      <RadioGroup bind:value={paymentMethod}>
        <div class="flex items-center space-x-2 p-3 border rounded-lg">
          <RadioGroupItem value="card" id="payment-card" />
          <Label for="payment-card" class="flex items-center space-x-2 cursor-pointer">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>Credit Card</span>
          </Label>
        </div>
        
        <div class="flex items-center space-x-2 p-3 border rounded-lg">
          <RadioGroupItem value="paypal" id="payment-paypal" />
          <Label for="payment-paypal" class="flex items-center space-x-2 cursor-pointer">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>PayPal</span>
          </Label>
        </div>
        
        <div class="flex items-center space-x-2 p-3 border rounded-lg">
          <RadioGroupItem value="apple" id="payment-apple" />
          <Label for="payment-apple" class="flex items-center space-x-2 cursor-pointer">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a3 3 0 0 0-3 3c0 1.642 2.5 6 2.5 6s2.5-4.358 2.5-6a3 3 0 0 0-3-3Z"/>
              <circle cx="12" cy="5" r="1"/>
            </svg>
            <span>Apple Pay</span>
          </Label>
        </div>
      </RadioGroup>
      
      {#if paymentMethod}
        <div class="mt-4 p-3 bg-muted rounded text-sm">
          Selected: <strong>{paymentMethod}</strong>
        </div>
      {/if}
    </CardContent>
  </Card>
</Story>

<Story name="Sizes">
  <div class="space-y-6">
    <div class="space-y-2">
      <p class="font-medium">Small</p>
      <RadioGroup value="small">
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="small" id="size-sm" size="sm" />
          <Label for="size-sm" class="text-sm">Small</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="medium" id="size-md-1" size="sm" />
          <Label for="size-md-1" class="text-sm">Medium</Label>
        </div>
      </RadioGroup>
    </div>
    
    <div class="space-y-2">
      <p class="font-medium">Default</p>
      <RadioGroup bind:value={size}>
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="small" id="size-sm-2" />
          <Label for="size-sm-2">Small</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="medium" id="size-md-2" />
          <Label for="size-md-2">Medium</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="large" id="size-lg-2" />
          <Label for="size-lg-2">Large</Label>
        </div>
      </RadioGroup>
    </div>
    
    <div class="space-y-2">
      <p class="font-medium">Large</p>
      <RadioGroup value="dark">
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="light" id="theme-light" size="lg" />
          <Label for="theme-light">Light</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="theme-dark" size="lg" />
          <Label for="theme-dark">Dark</Label>
        </div>
      </RadioGroup>
    </div>
  </div>
</Story>

<Story name="Disabled">
  <RadioGroup value="option2">
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="option1" id="disabled1" />
      <Label for="disabled1">Available option</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="option2" id="disabled2" />
      <Label for="disabled2">Selected option</Label>
    </div>
    <div class="flex items-center space-x-2 opacity-50">
      <RadioGroupItem value="option3" id="disabled3" disabled />
      <Label for="disabled3">Disabled option</Label>
    </div>
  </RadioGroup>
</Story>

<Story name="Plan Selection">
  <div class="max-w-md space-y-4">
    <h3 class="font-semibold text-lg">Choose your plan</h3>
    
    <RadioGroup bind:value={plan}>
      <div class="border rounded-lg p-4 space-y-2">
        <div class="flex items-center space-x-2">
          <RadioGroupItem value="free" id="plan-free" />
          <Label for="plan-free" class="font-medium">Free</Label>
        </div>
        <div class="ml-6">
          <p class="text-sm text-muted-foreground">
            Perfect for getting started
          </p>
          <ul class="text-xs text-muted-foreground mt-2 space-y-1">
            <li>• Up to 3 projects</li>
            <li>• 1GB storage</li>
            <li>• Basic support</li>
          </ul>
        </div>
      </div>
      
      <div class="border rounded-lg p-4 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <RadioGroupItem value="pro" id="plan-pro" />
            <Label for="plan-pro" class="font-medium">Pro</Label>
          </div>
          <span class="text-sm font-medium">$9/month</span>
        </div>
        <div class="ml-6">
          <p class="text-sm text-muted-foreground">
            For growing teams
          </p>
          <ul class="text-xs text-muted-foreground mt-2 space-y-1">
            <li>• Unlimited projects</li>
            <li>• 100GB storage</li>
            <li>• Priority support</li>
            <li>• Advanced analytics</li>
          </ul>
        </div>
      </div>
      
      <div class="border rounded-lg p-4 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <RadioGroupItem value="enterprise" id="plan-enterprise" />
            <Label for="plan-enterprise" class="font-medium">Enterprise</Label>
          </div>
          <span class="text-sm font-medium">Custom</span>
        </div>
        <div class="ml-6">
          <p class="text-sm text-muted-foreground">
            For large organizations
          </p>
          <ul class="text-xs text-muted-foreground mt-2 space-y-1">
            <li>• Everything in Pro</li>
            <li>• Unlimited storage</li>
            <li>• 24/7 support</li>
            <li>• Custom integrations</li>
          </ul>
        </div>
      </div>
    </RadioGroup>
    
    {#if plan}
      <div class="p-3 bg-muted rounded text-sm">
        Selected plan: <strong>{plan}</strong>
      </div>
    {/if}
  </div>
</Story>

<Story name="Interactive">
  <div class="space-y-4">
    <RadioGroup bind:value={theme}>
      <div class="flex items-center space-x-2">
        <RadioGroupItem value="light" id="theme-light-2" />
        <Label for="theme-light-2">Light theme</Label>
      </div>
      <div class="flex items-center space-x-2">
        <RadioGroupItem value="dark" id="theme-dark-2" />
        <Label for="theme-dark-2">Dark theme</Label>
      </div>
      <div class="flex items-center space-x-2">
        <RadioGroupItem value="system" id="theme-system" />
        <Label for="theme-system">Use system setting</Label>
      </div>
    </RadioGroup>
    
    <div class="text-sm text-muted-foreground">
      Current selection: {theme || 'None'}
    </div>
  </div>
</Story>

<Story name="Playground" let:args>
  <RadioGroup {...args} value="option2">
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="option1" id="playground1" />
      <Label for="playground1">Option 1</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="option2" id="playground2" />
      <Label for="playground2">Option 2</Label>
    </div>
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="option3" id="playground3" />
      <Label for="playground3">Option 3</Label>
    </div>
  </RadioGroup>
</Story>