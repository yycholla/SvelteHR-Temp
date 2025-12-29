# Feature 35: Command Palette

## Overview
Keyboard-first command palette (Cmd+K / Ctrl+K) for power users to quickly execute sync operations, navigate, and access features without clicking through menus.

## Current System Integration
- Mouse-driven UI
- No keyboard shortcuts
- No quick actions menu
- Multi-step processes for common tasks

## Key Components
- Command palette overlay (Cmd+K)
- Fuzzy search for commands
- Recent commands history
- Context-aware suggestions
- Keyboard shortcuts display
- Custom command creation
- Command categories

## Technical Requirements
### Frontend Command Palette
```svelte
<script lang="ts">
  import { CommandPalette } from '$lib/components/CommandPalette';
  
  let open = $state(false);
  let commands = [
    {
      id: 'sync-employees',
      label: 'Sync Employees',
      icon: '👥',
      category: 'Sync',
      shortcut: 'Cmd+Shift+E',
      action: () => syncEmployees()
    },
    {
      id: 'view-conflicts',
      label: 'View Conflicts',
      icon: '⚠️',
      category: 'Navigate',
      action: () => goto('/integrations/conflicts')
    },
    {
      id: 'preview-sync',
      label: 'Preview Next Sync',
      icon: '🔍',
      category: 'Sync',
      action: () => openPreview()
    }
  ];
  
  // Global keyboard listener
  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open = true;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<CommandPalette bind:open {commands} />
```

### Command Registry
```typescript
interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: 'Sync' | 'Navigate' | 'Settings' | 'Help';
  shortcut?: string;
  keywords?: string[]; // For fuzzy search
  action: () => void | Promise<void>;
  permission?: string; // Required permission
}

class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  
  register(command: Command) {
    this.commands.set(command.id, command);
  }
  
  search(query: string): Command[] {
    // Fuzzy search implementation
    return Array.from(this.commands.values())
      .filter(cmd => matchesFuzzy(cmd, query))
      .sort(byRelevance);
  }
}
```

### Built-in Commands
**Sync Actions:**
- `sync employees` - Sync all employees
- `sync departments` - Sync all departments
- `sync bidirectional` - Bidirectional sync
- `preview sync` - Preview sync changes
- `force full sync` - Force full refresh

**Navigation:**
- `go to conflicts` - View conflicts page
- `go to timeline` - View sync timeline
- `go to settings` - Integration settings
- `go to dashboard` - Main dashboard

**Settings:**
- `configure schedule` - Set up sync schedule
- `manage integrations` - Third-party integrations
- `view api usage` - QB API quota

**Utilities:**
- `export sync log` - Export history
- `run health check` - Check system health
- `clear cache` - Clear sync cache

## Dependencies
- Fuzzy search library (fuse.js)
- Keyboard shortcut library
- Command palette component (cmdk, kbar)
- Local storage for recent commands

## Implementation Phases
### Phase 1: Basic Palette
- Command palette overlay
- Basic command execution
- Fuzzy search

### Phase 2: Advanced Features
- Keyboard shortcuts
- Recent commands
- Command categories

### Phase 3: Customization
- User-defined commands
- Custom shortcuts
- Command aliases

## Research Notes
- [ ] Best command palette libraries
- [ ] Keyboard shortcut conflicts
- [ ] Accessibility (screen readers)
- [ ] Mobile experience (no keyboard)
- [ ] Command discovery (how users learn commands)

## UI Mockup
```
┌─────────────────────────────────────────────┐
│ 🔍 Type a command...                        │
├─────────────────────────────────────────────┤
│ SYNC                                        │
│ ▸ 👥 Sync Employees          Cmd+Shift+E   │
│   🏢 Sync Departments        Cmd+Shift+D   │
│   🔄 Bidirectional Sync                    │
│   🔍 Preview Sync                          │
│                                             │
│ NAVIGATE                                    │
│   ⚠️  View Conflicts                        │
│   📊 Sync Timeline                         │
│   ⚙️  Settings                              │
│                                             │
│ RECENT                                      │
│   ✅ Sync Employees (2 hours ago)          │
└─────────────────────────────────────────────┘
```

## Success Metrics
- Command palette usage > 30% of users
- Power users use keyboard > 80% of time
- Average task completion 50% faster
- User satisfaction with keyboard nav > 9/10

## Notes
_Research findings and implementation decisions_
