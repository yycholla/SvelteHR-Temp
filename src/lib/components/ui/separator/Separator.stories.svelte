<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Separator',
    component: Separator,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      orientation: {
        control: { type: 'select' },
        options: ['horizontal', 'vertical'],
      },
      decorative: {
        control: { type: 'boolean' },
      },
    },
    args: {
      orientation: 'horizontal',
      decorative: true,
    },
  });
</script>

<script>
  import Separator from './separator.svelte';
  import Button from '../button/button.svelte';
  import { Home, Search, Settings, User } from 'lucide-svelte';
</script>

<Story name="Horizontal">
  <div class="w-80">
    <div class="space-y-1">
      <h4 class="text-sm font-medium leading-none">Radix Primitives</h4>
      <p class="text-sm text-muted-foreground">An open-source UI component library.</p>
    </div>
    <Separator class="my-4" />
    <div class="flex h-5 items-center space-x-4 text-sm">
      <div>Blog</div>
      <Separator orientation="vertical" />
      <div>Docs</div>
      <Separator orientation="vertical" />
      <div>Source</div>
    </div>
  </div>
</Story>

<Story name="Vertical">
  <div class="flex h-20 items-center justify-center space-x-4">
    <div class="text-sm">Blog</div>
    <Separator orientation="vertical" />
    <div class="text-sm">Docs</div>
    <Separator orientation="vertical" />
    <div class="text-sm">Source</div>
  </div>
</Story>

<Story name="In Navigation">
  <div class="w-64 p-4 border rounded-lg">
    <nav class="space-y-2">
      <div class="space-y-1">
        <Button variant="ghost" class="w-full justify-start">
          <Home class="mr-2 h-4 w-4" />
          Dashboard
        </Button>
        <Button variant="ghost" class="w-full justify-start">
          <Search class="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>
      
      <Separator />
      
      <div class="space-y-1">
        <Button variant="ghost" class="w-full justify-start">
          <User class="mr-2 h-4 w-4" />
          Profile
        </Button>
        <Button variant="ghost" class="w-full justify-start">
          <Settings class="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </nav>
  </div>
</Story>

<Story name="In Content">
  <div class="max-w-md">
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold">Personal Information</h3>
        <p class="text-sm text-muted-foreground">Update your personal details here.</p>
      </div>
      
      <Separator />
      
      <div class="grid gap-2">
        <label class="text-sm font-medium">Full name</label>
        <input class="px-3 py-1 border rounded text-sm" value="John Doe" />
      </div>
      
      <div class="grid gap-2">
        <label class="text-sm font-medium">Email</label>
        <input class="px-3 py-1 border rounded text-sm" value="john@example.com" />
      </div>
      
      <Separator />
      
      <div>
        <h3 class="text-lg font-semibold">Preferences</h3>
        <p class="text-sm text-muted-foreground">Configure your account preferences.</p>
      </div>
      
      <div class="space-y-2">
        <label class="flex items-center space-x-2 text-sm">
          <input type="checkbox" />
          <span>Email notifications</span>
        </label>
        <label class="flex items-center space-x-2 text-sm">
          <input type="checkbox" />
          <span>SMS notifications</span>
        </label>
      </div>
    </div>
  </div>
</Story>

<Story name="In Cards">
  <div class="w-80 p-6 border rounded-lg">
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold">Account Summary</h3>
        <p class="text-sm text-muted-foreground">Your account overview</p>
      </div>
      
      <Separator />
      
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-sm">Balance</span>
          <span class="text-sm font-medium">$2,450.00</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm">Available</span>
          <span class="text-sm font-medium">$2,200.00</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm">Pending</span>
          <span class="text-sm font-medium">$250.00</span>
        </div>
      </div>
      
      <Separator />
      
      <div class="flex space-x-2">
        <Button size="sm" class="flex-1">Transfer</Button>
        <Button size="sm" variant="outline" class="flex-1">Withdraw</Button>
      </div>
    </div>
  </div>
</Story>

<Story name="Toolbar Separator">
  <div class="flex items-center space-x-2 p-2 border rounded-lg">
    <Button size="icon" variant="ghost">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    </Button>
    <Button size="icon" variant="ghost">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="21 15l-5-5L5 21"/>
      </svg>
    </Button>
    <Button size="icon" variant="ghost">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3"/>
      </svg>
    </Button>
    
    <Separator orientation="vertical" class="h-6" />
    
    <Button size="icon" variant="ghost">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </Button>
    <Button size="icon" variant="ghost">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    </Button>
  </div>
</Story>

<Story name="Menu Separator">
  <div class="w-48 p-1 border rounded-lg shadow-lg bg-background">
    <div class="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer">Cut</div>
    <div class="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer">Copy</div>
    <div class="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer">Paste</div>
    
    <Separator class="my-1" />
    
    <div class="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer">Select All</div>
    <div class="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer">Find</div>
    
    <Separator class="my-1" />
    
    <div class="px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer text-destructive">Delete</div>
  </div>
</Story>

<Story name="Custom Styling">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <p class="text-sm font-medium">Default</p>
      <Separator />
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Thick</p>
      <Separator class="h-1" />
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Dashed</p>
      <Separator class="border-dashed border-t border-border h-0" />
    </div>
    
    <div class="space-y-2">
      <p class="text-sm font-medium">Colored</p>
      <Separator class="bg-blue-500" />
    </div>
  </div>
</Story>

<Story name="Playground" let:args>
  <div class="w-80 space-y-4">
    <div class="text-sm">Content above separator</div>
    <Separator {...args} />
    <div class="text-sm">Content below separator</div>
  </div>
</Story>