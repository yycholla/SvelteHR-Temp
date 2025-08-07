<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Tooltip',
    component: Tooltip,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    args: {},
  });
</script>

<script>
  import Tooltip from './tooltip.svelte';
  import TooltipTrigger from './tooltip-trigger.svelte';
  import TooltipContent from './tooltip-content.svelte';
  import Button from '../button/button.svelte';
  import { Info, HelpCircle, Settings, Download, Edit, Trash2, Plus, Calendar, User } from 'lucide-svelte';
</script>

<Story name="Default">
  <Tooltip>
    <TooltipTrigger>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Add to library</p>
    </TooltipContent>
  </Tooltip>
</Story>

<Story name="With Icon Button">
  <Tooltip>
    <TooltipTrigger>
      <Button size="icon" variant="outline">
        <Info class="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Show information</p>
    </TooltipContent>
  </Tooltip>
</Story>

<Story name="Positions">
  <div class="flex flex-col items-center space-y-8">
    <!-- Top -->
    <Tooltip>
      <TooltipTrigger>
        <Button variant="outline">Top</Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Tooltip on top</p>
      </TooltipContent>
    </Tooltip>
    
    <!-- Middle row -->
    <div class="flex items-center space-x-8">
      <!-- Left -->
      <Tooltip>
        <TooltipTrigger>
          <Button variant="outline">Left</Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
      
      <!-- Right -->
      <Tooltip>
        <TooltipTrigger>
          <Button variant="outline">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>
    </div>
    
    <!-- Bottom -->
    <Tooltip>
      <TooltipTrigger>
        <Button variant="outline">Bottom</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Tooltip on bottom</p>
      </TooltipContent>
    </Tooltip>
  </div>
</Story>

<Story name="Toolbar with Tooltips">
  <div class="flex items-center space-x-1 p-2 border rounded-lg bg-background">
    <Tooltip>
      <TooltipTrigger>
        <Button size="icon" variant="ghost">
          <Plus class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Create new (Ctrl+N)</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger>
        <Button size="icon" variant="ghost">
          <Edit class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit selected item (Ctrl+E)</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger>
        <Button size="icon" variant="ghost">
          <Download class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Download file (Ctrl+D)</p>
      </TooltipContent>
    </Tooltip>
    
    <div class="w-px h-6 bg-border mx-1"></div>
    
    <Tooltip>
      <TooltipTrigger>
        <Button size="icon" variant="ghost">
          <Settings class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Open settings</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger>
        <Button size="icon" variant="ghost">
          <Trash2 class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete selected (Del)</p>
      </TooltipContent>
    </Tooltip>
  </div>
</Story>

<Story name="Help Tooltips">
  <div class="max-w-md space-y-4">
    <div class="flex items-center space-x-2">
      <label class="text-sm font-medium">Email address</label>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle class="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p>We'll never share your email with anyone else.</p>
        </TooltipContent>
      </Tooltip>
    </div>
    
    <div class="flex items-center space-x-2">
      <label class="text-sm font-medium">Password strength</label>
      <Tooltip>
        <TooltipTrigger>
          <Info class="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent class="max-w-xs">
          <p>Password must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols.</p>
        </TooltipContent>
      </Tooltip>
    </div>
    
    <div class="flex items-center space-x-2">
      <label class="text-sm font-medium">Two-factor authentication</label>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle class="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Add an extra layer of security to your account.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</Story>

<Story name="Status Indicators">
  <div class="space-y-4">
    <div class="flex items-center space-x-4">
      <Tooltip>
        <TooltipTrigger>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <span class="text-sm">Service A</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Operational - All systems running normally</p>
        </TooltipContent>
      </Tooltip>
    </div>
    
    <div class="flex items-center space-x-4">
      <Tooltip>
        <TooltipTrigger>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span class="text-sm">Service B</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Degraded Performance - Some delays expected</p>
        </TooltipContent>
      </Tooltip>
    </div>
    
    <div class="flex items-center space-x-4">
      <Tooltip>
        <TooltipTrigger>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span class="text-sm">Service C</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Major Outage - Service currently unavailable</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</Story>

<Story name="Interactive Content">
  <div class="flex items-center space-x-4">
    <Tooltip>
      <TooltipTrigger>
        <div class="p-4 border rounded-lg cursor-pointer hover:bg-muted">
          <User class="h-8 w-8 mx-auto mb-2" />
          <p class="text-sm font-medium text-center">John Doe</p>
        </div>
      </TooltipTrigger>
      <TooltipContent class="max-w-xs">
        <div class="space-y-2">
          <p class="font-medium">John Doe</p>
          <p class="text-xs">Senior Developer</p>
          <p class="text-xs">john.doe@company.com</p>
          <p class="text-xs text-muted-foreground">Last seen 2 hours ago</p>
        </div>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger>
        <div class="p-4 border rounded-lg cursor-pointer hover:bg-muted">
          <Calendar class="h-8 w-8 mx-auto mb-2" />
          <p class="text-sm font-medium text-center">Schedule</p>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div class="space-y-1">
          <p class="font-medium">Upcoming Events</p>
          <p class="text-xs">Team Meeting - 2:00 PM</p>
          <p class="text-xs">Project Review - 4:30 PM</p>
        </div>
      </TooltipContent>
    </Tooltip>
  </div>
</Story>

<Story name="Long Content">
  <Tooltip>
    <TooltipTrigger>
      <Button variant="outline">Long tooltip</Button>
    </TooltipTrigger>
    <TooltipContent class="max-w-sm">
      <div class="space-y-2">
        <p class="font-medium">Advanced Settings</p>
        <p class="text-xs">
          This feature allows you to configure advanced settings for your application. 
          Please note that changing these settings may affect the performance and behavior 
          of your application. Make sure you understand the implications before proceeding.
        </p>
        <p class="text-xs text-muted-foreground">
          For more information, consult the documentation or contact support.
        </p>
      </div>
    </TooltipContent>
  </Tooltip>
</Story>

<Story name="Disabled Elements">
  <div class="flex items-center space-x-4">
    <Tooltip>
      <TooltipTrigger>
        <div class="inline-block">
          <Button disabled>Disabled Button</Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>This action is not available right now</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger>
        <div class="inline-block">
          <Button size="icon" disabled variant="outline">
            <Download class="h-4 w-4" />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Download will be available after processing completes</p>
      </TooltipContent>
    </Tooltip>
  </div>
</Story>

<Story name="Custom Styling">
  <div class="flex items-center space-x-4">
    <Tooltip>
      <TooltipTrigger>
        <Button variant="destructive">Delete</Button>
      </TooltipTrigger>
      <TooltipContent class="bg-destructive text-destructive-foreground">
        <p>⚠️ This action cannot be undone</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger>
        <Button variant="outline">Success</Button>
      </TooltipTrigger>
      <TooltipContent class="bg-green-600 text-white">
        <p>✅ Operation completed successfully</p>
      </TooltipContent>
    </Tooltip>
  </div>
</Story>

<Story name="Keyboard Navigation">
  <div class="space-y-2">
    <p class="text-sm text-muted-foreground">Use Tab to navigate, Enter to activate tooltips</p>
    <div class="flex items-center space-x-2">
      <Tooltip>
        <TooltipTrigger>
          <Button variant="outline">First</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>First tooltip (Tab + Enter to show)</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger>
          <Button variant="outline">Second</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Second tooltip (accessible via keyboard)</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger>
          <Button variant="outline">Third</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Third tooltip (focus management)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</Story>