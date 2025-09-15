<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '../base/Button.svelte';
  import Card from '../base/Card.svelte';
  import Badge from '../base/Badge.svelte';
  import Input from '../base/Input.svelte';
  import Textarea from '../base/Textarea.svelte';
  import type { OnboardingTask } from '$lib/services/onboardingService';

  export let tasks: OnboardingTask[] = [];
  export let readonly: boolean = false;
  export let showCategories: boolean = true;
  export let allowNotes: boolean = true;

  const dispatch = createEventDispatcher<{
    taskComplete: { taskId: string; notes?: string };
    taskStart: { taskId: string };
    taskUpdate: { taskId: string; updates: Partial<OnboardingTask> };
  }>();

  // Group tasks by category
  $: tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  $: categoryOrder = ['HR', 'IT', 'Security', 'Training', 'Equipment', 'Documentation', 'Other'];

  let selectedTask: OnboardingTask | null = null;
  let taskNotes = '';

  function getStatusColor(status: string): string {
    switch (status) {
      case 'Completed': return 'text-green-600';
      case 'InProgress': return 'text-blue-600';
      case 'Blocked': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'Completed': return 'check-circle';
      case 'InProgress': return 'clock';
      case 'Blocked': return 'x-circle';
      default: return 'circle';
    }
  }

  function getTaskTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'document': return 'file-text';
      case 'meeting': return 'calendar';
      case 'training': return 'book';
      case 'system': return 'settings';
      case 'review': return 'eye';
      default: return 'check-square';
    }
  }

  function getPriorityLevel(task: OnboardingTask): 'high' | 'medium' | 'low' {
    if (task.is_required && task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 1) return 'high';
      if (daysUntilDue <= 3) return 'medium';
    }
    return 'low';
  }

  function formatDueDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDue} days`;
  }

  function handleTaskAction(task: OnboardingTask, action: 'start' | 'complete') {
    if (readonly) return;

    selectedTask = task;
    taskNotes = task.notes || '';

    if (action === 'start') {
      dispatch('taskStart', { taskId: task.id });
      selectedTask = null;
    } else if (action === 'complete') {
      // Show completion dialog if notes are allowed
      if (allowNotes) {
        // Modal will be handled by the parent component
        return;
      } else {
        dispatch('taskComplete', { taskId: task.id });
      }
    }
  }

  function handleCompleteWithNotes() {
    if (selectedTask) {
      dispatch('taskComplete', { 
        taskId: selectedTask.id, 
        notes: taskNotes.trim() || undefined 
      });
      selectedTask = null;
      taskNotes = '';
    }
  }

  function cancelCompletion() {
    selectedTask = null;
    taskNotes = '';
  }
</script>

<div class="onboarding-checklist">
  {#if showCategories}
    <!-- Categorized View -->
    {#each categoryOrder as category}
      {#if tasksByCategory[category]?.length > 0}
        <Card padding="md" class="category-section">
          <div class="category-header">
            <h3 class="category-title">{category}</h3>
            <div class="category-stats">
              {tasksByCategory[category].filter(t => t.status === 'Completed').length} / {tasksByCategory[category].length} completed
            </div>
          </div>

          <div class="task-list">
            {#each tasksByCategory[category] as task (task.id)}
              <div class="task-item" class:completed={task.status === 'Completed'}>
                <div class="task-main">
                  <div class="task-status">
                    <i class="icon-{getStatusIcon(task.status)} w-5 h-5 {getStatusColor(task.status)}"></i>
                  </div>

                  <div class="task-content">
                    <div class="task-header">
                      <div class="task-title-row">
                        <span class="task-title">{task.title}</span>
                        <div class="task-badges">
                          {#if task.is_required}
                            <Badge variant="danger" size="xs">Required</Badge>
                          {/if}
                          {#if getPriorityLevel(task) === 'high'}
                            <Badge variant="danger" size="xs">Urgent</Badge>
                          {/if}
                        </div>
                      </div>

                      <div class="task-meta">
                        <span class="task-type">
                          <i class="icon-{getTaskTypeIcon(task.task_type)} w-4 h-4"></i>
                          {task.task_type}
                        </span>
                        
                        {#if task.due_date}
                          <span class="task-due" class:overdue={getPriorityLevel(task) === 'high'}>
                            <i class="icon-calendar w-4 h-4"></i>
                            {formatDueDate(task.due_date)}
                          </span>
                        {/if}

                        {#if task.estimated_hours}
                          <span class="task-duration">
                            <i class="icon-clock w-4 h-4"></i>
                            {task.estimated_hours}h
                          </span>
                        {/if}
                      </div>
                    </div>

                    {#if task.description}
                      <p class="task-description">{task.description}</p>
                    {/if}

                    {#if task.assigned_to}
                      <div class="task-assignee">
                        <span class="assignee-label">Assigned to:</span>
                        <span class="assignee-name">{task.assigned_to.display_name || task.assigned_to.displayName}</span>
                      </div>
                    {/if}
                  </div>

                  {#if !readonly && task.status !== 'Completed'}
                    <div class="task-actions">
                      {#if task.status === 'Pending'}
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon="play"
                          on:click={() => handleTaskAction(task, 'start')}
                        >
                          Start
                        </Button>
                      {:else if task.status === 'InProgress'}
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon="check"
                          on:click={() => handleTaskAction(task, 'complete')}
                        >
                          Complete
                        </Button>
                      {/if}
                    </div>
                  {/if}
                </div>

                {#if task.instructions}
                  <div class="task-instructions">
                    <details>
                      <summary class="instructions-toggle">
                        <i class="icon-info w-4 h-4"></i>
                        Instructions
                      </summary>
                      <div class="instructions-content">
                        {task.instructions}
                      </div>
                    </details>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card>
      {/if}
    {/each}
  {:else}
    <!-- Flat List View -->
    <Card padding="md" class="task-list-flat">
      {#each tasks as task (task.id)}
        <div class="task-item" class:completed={task.status === 'Completed'}>
          <!-- Similar structure as above but without categories -->
        </div>
      {/each}
    </Card>
  {/if}
</div>

<!-- Completion Modal -->
{#if selectedTask && allowNotes}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Complete Task</h3>
        <button class="modal-close" on:click={cancelCompletion}>
          <i class="icon-x w-5 h-5"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="task-info">
          <h4 class="task-name">{selectedTask.title}</h4>
          {#if selectedTask.description}
            <p class="task-desc">{selectedTask.description}</p>
          {/if}
        </div>

        <div class="notes-section">
          <Textarea
            label="Completion Notes (Optional)"
            bind:value={taskNotes}
            placeholder="Add any notes about completing this task..."
            rows="4"
          />
        </div>
      </div>

      <div class="modal-footer">
        <Button
          variant="secondary"
          on:click={cancelCompletion}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          leftIcon="check"
          on:click={handleCompleteWithNotes}
        >
          Mark Complete
        </Button>
      </div>
    </div>
  </div>
{/if}

<style lang="postcss">
  .onboarding-checklist {
    @apply space-y-6;
  }

  /* Category Section */
  .category-section {
    @apply border border-gray-200;
  }

  .category-header {
    @apply flex items-center justify-between mb-4 pb-3 border-b border-gray-100;
  }

  .category-title {
    @apply text-lg font-semibold text-gray-900;
  }

  .category-stats {
    @apply text-sm text-gray-600 font-medium;
  }

  .task-list {
    @apply space-y-4;
  }

  /* Task Item */
  .task-item {
    @apply border-l-4 border-gray-200 bg-white rounded-lg p-4 transition-all hover:shadow-sm;
  }

  .task-item.completed {
    @apply border-l-green-400 bg-green-50;
  }

  .task-main {
    @apply flex items-start space-x-3;
  }

  .task-status {
    @apply flex-shrink-0 mt-1;
  }

  .task-content {
    @apply flex-1 min-w-0;
  }

  .task-header {
    @apply space-y-2;
  }

  .task-title-row {
    @apply flex items-start justify-between;
  }

  .task-title {
    @apply text-base font-medium text-gray-900;
  }

  .task-badges {
    @apply flex items-center space-x-1;
  }

  .task-meta {
    @apply flex items-center space-x-4 text-sm text-gray-600;
  }

  .task-type,
  .task-due,
  .task-duration {
    @apply flex items-center space-x-1;
  }

  .task-due.overdue {
    @apply text-red-600 font-medium;
  }

  .task-description {
    @apply text-sm text-gray-600 mt-2;
  }

  .task-assignee {
    @apply text-sm text-gray-600 mt-2;
  }

  .assignee-label {
    @apply font-medium;
  }

  .task-actions {
    @apply flex-shrink-0 ml-4;
  }

  /* Instructions */
  .task-instructions {
    @apply mt-3 pt-3 border-t border-gray-100;
  }

  .instructions-toggle {
    @apply flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900;
  }

  .instructions-content {
    @apply mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded;
  }

  /* Modal */
  .modal-overlay {
    @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
  }

  .modal-content {
    @apply bg-white rounded-lg shadow-lg max-w-md w-full mx-4;
  }

  .modal-header {
    @apply flex items-center justify-between p-4 border-b;
  }

  .modal-title {
    @apply text-lg font-semibold text-gray-900;
  }

  .modal-close {
    @apply text-gray-400 hover:text-gray-600 p-1;
  }

  .modal-body {
    @apply p-4 space-y-4;
  }

  .task-info {
    @apply space-y-2;
  }

  .task-name {
    @apply font-medium text-gray-900;
  }

  .task-desc {
    @apply text-sm text-gray-600;
  }

  .modal-footer {
    @apply flex items-center justify-end space-x-3 p-4 border-t bg-gray-50;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .task-main {
      @apply flex-col space-x-0 space-y-3;
    }

    .task-meta {
      @apply flex-col items-start space-x-0 space-y-1;
    }

    .task-title-row {
      @apply flex-col items-start space-y-2;
    }
  }
</style>