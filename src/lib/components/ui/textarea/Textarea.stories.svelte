<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'UI/Textarea',
    component: Textarea,
    parameters: {
      layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
      size: {
        control: { type: 'select' },
        options: ['sm', 'default', 'lg'],
      },
      disabled: {
        control: { type: 'boolean' },
      },
      readonly: {
        control: { type: 'boolean' },
      },
    },
    args: {
      size: 'default',
      disabled: false,
      readonly: false,
    },
  });
</script>

<script>
  import Textarea from './textarea.svelte';
  import Label from '../label/label.svelte';
  import Button from '../button/button.svelte';
  import Card from '../card/card.svelte';
  import CardHeader from '../card/card-header.svelte';
  import CardTitle from '../card/card-title.svelte';
  import CardContent from '../card/card-content.svelte';
  import CardFooter from '../card/card-footer.svelte';
  
  let feedback = $state('');
  let message = $state('');
  let bio = $state('');
  let notes = $state(`Meeting Notes - ${new Date().toLocaleDateString()}

Attendees:
- John Doe
- Jane Smith
- Mike Johnson

Agenda:
1. Project status update
2. Budget review
3. Next steps

Key Points:
- Project is on track for Q3 delivery
- Budget requires adjustment for additional resources
- Need to schedule follow-up meeting

Action Items:
- [ ] Update project timeline
- [ ] Prepare budget proposal
- [ ] Send meeting summary to stakeholders`);
</script>

<Story name="Default">
  <div class="w-80">
    <Textarea placeholder="Type your message here." />
  </div>
</Story>

<Story name="With Label">
  <div class="w-80 space-y-2">
    <Label for="message">Your message</Label>
    <Textarea id="message" placeholder="Type your message here." />
  </div>
</Story>

<Story name="Sizes">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <Label>Small</Label>
      <Textarea size="sm" placeholder="Small textarea" />
    </div>
    
    <div class="space-y-2">
      <Label>Default</Label>
      <Textarea size="default" placeholder="Default textarea" />
    </div>
    
    <div class="space-y-2">
      <Label>Large</Label>
      <Textarea size="lg" placeholder="Large textarea" />
    </div>
  </div>
</Story>

<Story name="Disabled and Readonly">
  <div class="w-80 space-y-4">
    <div class="space-y-2">
      <Label>Disabled</Label>
      <Textarea disabled placeholder="This is disabled" />
    </div>
    
    <div class="space-y-2">
      <Label>Read-only</Label>
      <Textarea readonly value="This is read-only content that cannot be edited." />
    </div>
  </div>
</Story>

<Story name="Feedback Form">
  <Card class="w-96">
    <CardHeader>
      <CardTitle>Send Feedback</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="feedback">Your feedback</Label>
        <Textarea 
          id="feedback" 
          placeholder="Tell us what you think..."
          bind:value={feedback}
          maxlength="500"
        />
        <p class="text-xs text-muted-foreground text-right">
          {feedback.length}/500 characters
        </p>
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full" disabled={!feedback.trim()}>Send Feedback</Button>
    </CardFooter>
  </Card>
</Story>

<Story name="Contact Form">
  <div class="w-96 space-y-4">
    <div class="space-y-2">
      <Label for="contact-message">Message *</Label>
      <Textarea 
        id="contact-message"
        placeholder="How can we help you?"
        bind:value={message}
        required
        class="resize-none"
        rows="4"
      />
    </div>
    
    {#if message}
      <div class="p-3 bg-muted rounded text-sm">
        <p class="font-medium">Preview:</p>
        <p class="mt-1 whitespace-pre-wrap">{message}</p>
      </div>
    {/if}
    
    <div class="flex gap-2">
      <Button variant="outline" onclick={() => message = ''}>Clear</Button>
      <Button disabled={!message.trim()}>Send Message</Button>
    </div>
  </div>
</Story>

<Story name="Profile Bio">
  <div class="w-96 space-y-4">
    <div class="space-y-2">
      <Label for="bio">Bio</Label>
      <Textarea 
        id="bio"
        placeholder="Tell us about yourself..."
        bind:value={bio}
        maxlength="160"
        rows="3"
      />
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>Brief description for your profile</span>
        <span>{bio.length}/160</span>
      </div>
    </div>
    
    <div class="p-4 border rounded-lg">
      <h4 class="font-medium">Profile Preview</h4>
      <div class="mt-2">
        <div class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-muted rounded-full"></div>
          <div>
            <div class="font-medium">John Doe</div>
            <div class="text-sm text-muted-foreground">
              {bio || 'No bio added yet'}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Story>

<Story name="Code Input">
  <div class="w-[32rem] space-y-2">
    <Label for="code">Code snippet</Label>
    <Textarea 
      id="code"
      placeholder="Paste your code here..."
      class="font-mono text-sm"
      rows="8"
      value={`function greet(name) {
  return \`Hello, \${name}!\`;
}

const message = greet('World');
console.log(message);`}
    />
  </div>
</Story>

<Story name="Notes with Character Count">
  <div class="w-[32rem] space-y-4">
    <div class="space-y-2">
      <Label for="notes">Meeting Notes</Label>
      <Textarea 
        id="notes"
        bind:value={notes}
        class="resize-y"
        rows="12"
      />
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>Auto-saved</span>
        <span>{notes.length} characters</span>
      </div>
    </div>
    
    <div class="flex gap-2">
      <Button variant="outline" size="sm">Export</Button>
      <Button variant="outline" size="sm">Share</Button>
      <Button size="sm">Save</Button>
    </div>
  </div>
</Story>

<Story name="Auto-resize">
  <div class="w-80 space-y-2">
    <Label for="auto-resize">Auto-resizing textarea</Label>
    <Textarea 
      id="auto-resize"
      placeholder="This textarea will grow as you type..."
      class="resize-none overflow-hidden"
      oninput={(e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }}
    />
    <p class="text-xs text-muted-foreground">
      Textarea height adjusts automatically
    </p>
  </div>
</Story>

<Story name="Rich Content">
  <div class="w-96 space-y-4">
    <div class="space-y-2">
      <Label for="description">Product Description</Label>
      <Textarea 
        id="description"
        placeholder="Enter product description with formatting..."
        rows="6"
        value={`**Product Name**: Premium Widget
**SKU**: PWD-2024-001

**Features**:
• Durable construction
• Easy to install
• 2-year warranty

**Description**:
This premium widget is designed for professional use. Made from high-quality materials, it offers exceptional performance and reliability.

*Note: Assembly required*`}
      />
    </div>
    
    <div class="p-4 border rounded-lg">
      <h4 class="font-medium mb-2">Formatted Preview</h4>
      <div class="prose prose-sm max-w-none text-sm">
        <p><strong>Product Name</strong>: Premium Widget</p>
        <p><strong>SKU</strong>: PWD-2024-001</p>
        <p><strong>Features</strong>:</p>
        <ul>
          <li>Durable construction</li>
          <li>Easy to install</li>
          <li>2-year warranty</li>
        </ul>
        <p><strong>Description</strong>:</p>
        <p>This premium widget is designed for professional use. Made from high-quality materials, it offers exceptional performance and reliability.</p>
        <p><em>Note: Assembly required</em></p>
      </div>
    </div>
  </div>
</Story>

<Story name="Playground" let:args>
  <div class="w-80 space-y-2">
    <Label for="playground">Textarea</Label>
    <Textarea {...args} id="playground" placeholder="Enter text here..." />
  </div>
</Story>