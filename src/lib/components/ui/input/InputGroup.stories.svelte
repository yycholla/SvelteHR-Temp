<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/InputGroup',
    component: InputGroup,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: { type: 'select' },
        options: ['default', 'error', 'success', 'warning'],
      },
      size: {
        control: { type: 'select' },
        options: ['xs', 'sm', 'md', 'lg', 'xl'],
      },
      loading: {
        control: { type: 'boolean' },
      },
      clearable: {
        control: { type: 'boolean' },
      },
      disabled: {
        control: { type: 'boolean' },
      },
      readonly: {
        control: { type: 'boolean' },
      },
    },
    args: {
      variant: 'default',
      size: 'md',
      loading: false,
      clearable: false,
      disabled: false,
      readonly: false,
    },
  });
</script>

<script>
  import InputGroup from './input-group.svelte';
  import { Search, Mail, User, Lock, DollarSign, Calendar, MapPin, Phone } from 'lucide-svelte';
  
  let searchValue = $state('');
  let emailValue = $state('');
  let priceValue = $state('');
</script>

<Story name="Basic">
  <div class="w-80">
    <InputGroup 
      label="Full Name" 
      placeholder="Enter your full name"
      required
    />
  </div>
</Story>

<Story name="With Prefix and Suffix">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Website"
      prefix="https://"
      suffix=".com"
      placeholder="example"
      description="Your website URL"
    />
    
    <InputGroup 
      label="Price"
      prefix="$"
      suffix="USD"
      placeholder="0.00"
      type="number"
    />
  </div>
</Story>

<Story name="With Icons">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Search"
      prefixIcon={Search}
      placeholder="Search for anything..."
      clearable
      bind:value={searchValue}
    />
    
    <InputGroup 
      label="Email"
      prefixIcon={Mail}
      placeholder="your@email.com"
      type="email"
      bind:value={emailValue}
    />
    
    <InputGroup 
      label="Password"
      prefixIcon={Lock}
      suffixIcon={User}
      placeholder="Enter password"
      type="password"
    />
  </div>
</Story>

<Story name="Sizes">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Extra Small"
      size="xs"
      placeholder="Extra small input"
      prefixIcon={User}
    />
    
    <InputGroup 
      label="Small"
      size="sm"
      placeholder="Small input"
      prefixIcon={User}
    />
    
    <InputGroup 
      label="Medium (Default)"
      size="md"
      placeholder="Medium input"
      prefixIcon={User}
    />
    
    <InputGroup 
      label="Large"
      size="lg"
      placeholder="Large input"
      prefixIcon={User}
    />
    
    <InputGroup 
      label="Extra Large"
      size="xl"
      placeholder="Extra large input"
      prefixIcon={User}
    />
  </div>
</Story>

<Story name="Validation States">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Default State"
      placeholder="Default input"
      description="This is a helper text"
    />
    
    <InputGroup 
      label="Success State"
      variant="success"
      placeholder="Success input"
      success="Great! This looks good."
      prefixIcon={Mail}
      value="user@example.com"
    />
    
    <InputGroup 
      label="Warning State"
      variant="warning"
      placeholder="Warning input"
      warning="Please double-check this field"
      prefixIcon={User}
      value="admin"
    />
    
    <InputGroup 
      label="Error State"
      variant="error"
      placeholder="Error input"
      error="This field is required"
      prefixIcon={Lock}
      required
    />
  </div>
</Story>

<Story name="Character Limit">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Tweet"
      placeholder="What's happening?"
      characterLimit={280}
      showCharacterCount
      description="Share your thoughts in 280 characters or less"
    />
    
    <InputGroup 
      label="Bio"
      placeholder="Tell us about yourself"
      characterLimit={160}
      showCharacterCount
      value="Senior developer with 10+ years of experience in web technologies. Love building user-friendly applications and solving complex problems."
    />
  </div>
</Story>

<Story name="Loading and Clearable">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Loading Input"
      placeholder="Loading..."
      loading
      prefixIcon={Search}
      description="Processing your request"
    />
    
    <InputGroup 
      label="Clearable Input"
      placeholder="Type something to see clear button"
      clearable
      bind:value={priceValue}
      prefixIcon={DollarSign}
    />
    
    <InputGroup 
      label="Both Loading and Clearable"
      placeholder="Complex state"
      loading
      clearable
      value="Some value"
      prefixIcon={Mail}
    />
  </div>
</Story>

<Story name="Form Example">
  <div class="w-96 space-y-4">
    <h3 class="text-lg font-semibold">Contact Information</h3>
    
    <div class="grid grid-cols-2 gap-4">
      <InputGroup 
        label="First Name"
        placeholder="John"
        prefixIcon={User}
        required
      />
      
      <InputGroup 
        label="Last Name"
        placeholder="Doe"
        prefixIcon={User}
        required
      />
    </div>
    
    <InputGroup 
      label="Email Address"
      placeholder="john.doe@example.com"
      prefixIcon={Mail}
      type="email"
      required
      description="We'll never share your email with anyone else"
    />
    
    <InputGroup 
      label="Phone Number"
      placeholder="(555) 123-4567"
      prefix="+1"
      prefixIcon={Phone}
      type="tel"
    />
    
    <InputGroup 
      label="Address"
      placeholder="123 Main St, City, State 12345"
      prefixIcon={MapPin}
    />
    
    <InputGroup 
      label="Date of Birth"
      type="date"
      prefixIcon={Calendar}
    />
    
    <div class="flex gap-2">
      <button class="px-4 py-2 bg-primary text-primary-foreground rounded">Submit</button>
      <button class="px-4 py-2 border rounded">Cancel</button>
    </div>
  </div>
</Story>

<Story name="Disabled and Readonly">
  <div class="w-80 space-y-4">
    <InputGroup 
      label="Disabled Input"
      placeholder="This is disabled"
      disabled
      prefixIcon={User}
      description="This input is disabled"
    />
    
    <InputGroup 
      label="Readonly Input"
      value="This is readonly content"
      readonly
      prefixIcon={Lock}
      description="This input is readonly"
    />
    
    <InputGroup 
      label="Disabled with Value"
      value="Disabled value"
      disabled
      prefix="$"
      suffix="USD"
      description="Disabled input with prefix and suffix"
    />
  </div>
</Story>

<Story name="Complex Inputs">
  <div class="w-96 space-y-4">
    <h3 class="text-lg font-semibold">Advanced Input Examples</h3>
    
    <InputGroup 
      label="API Endpoint"
      prefix="https://api."
      suffix="/v1"
      placeholder="yoursite.com"
      description="Enter your API domain"
      clearable
    />
    
    <InputGroup 
      label="Database Connection"
      prefix="postgresql://"
      placeholder="user:password@host:port/database"
      prefixIcon={Lock}
      type="password"
      description="Your database connection string"
      characterLimit={200}
      showCharacterCount
    />
    
    <InputGroup 
      label="Search Query"
      prefixIcon={Search}
      placeholder="Search products, users, orders..."
      clearable
      suffixIcon={Calendar}
      description="Use advanced search operators for better results"
    />
    
    <InputGroup 
      label="Product Price"
      prefix="$"
      suffix="USD"
      placeholder="0.00"
      type="number"
      prefixIcon={DollarSign}
      description="Product price in US dollars"
      min="0"
      step="0.01"
    />
  </div>
</Story>

<Story name="Playground" let:args>
  <div class="w-80">
    <InputGroup 
      {...args}
      label="Playground Input"
      placeholder="Customize me using controls"
      prefixIcon={User}
    />
  </div>
</Story>