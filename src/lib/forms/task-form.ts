import { writable } from 'svelte/store';
import { z } from 'zod';

// Simple form schema for task creation
export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  status: z.enum(['Pending', 'InProgress', 'Completed', 'Blocked']),
  dueDate: z.string(),
  assignedToId: z.number().optional(),
  relatedEntityType: z.enum(['Onboarding', 'Offboarding', 'Compliance', 'General'])
});

export type TaskFormInput = z.infer<typeof taskFormSchema>;

export function createTaskForm(options: { onSuccess?: (task: any) => void } = {}) {
  const initialData: TaskFormInput = {
    title: '',
    description: '',
    status: 'Pending',
    dueDate: '',
    assignedToId: undefined,
    relatedEntityType: 'General'
  };

  const formData = writable(initialData);
  const errors = writable<Partial<Record<keyof TaskFormInput, string>>>({});
  const submitting = writable(false);

  const enhance = (form: HTMLFormElement) => {
    const handleSubmit = async (event: SubmitEvent) => {
      event.preventDefault();
      submitting.set(true);
      errors.set({});

      try {
        const data = new FormData(form);
        const formValues: any = {};
        
        // Extract form data
        formValues.title = data.get('title')?.toString() || '';
        formValues.description = data.get('description')?.toString() || '';
        formValues.status = data.get('status')?.toString() || 'Pending';
        formValues.dueDate = data.get('dueDate')?.toString() || '';
        formValues.relatedEntityType = data.get('relatedEntityType')?.toString() || 'General';
        
        const assignedToId = data.get('assignedToId')?.toString();
        if (assignedToId && assignedToId !== '') {
          formValues.assignedToId = parseInt(assignedToId);
        }

        // Validate the data
        const validatedData = taskFormSchema.parse(formValues);
        
        // Submit to API
        const response = await fetch('/api/v2/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validatedData)
        });

        if (response.ok) {
          const created = await response.json();
          if (options.onSuccess) options.onSuccess(created);
          formData.set(initialData); // Reset form
        } else {
          const errorText = await response.text();
          errors.set({ title: `Failed to create task: ${errorText}` });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Partial<Record<keyof TaskFormInput, string>> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              fieldErrors[err.path[0] as keyof TaskFormInput] = err.message;
            }
          });
          errors.set(fieldErrors);
        } else {
          console.error('Task creation error:', error);
          errors.set({ title: 'Failed to create task. Please try again.' });
        }
      } finally {
        submitting.set(false);
      }
    };

    form.addEventListener('submit', handleSubmit);

    return {
      destroy() {
        form.removeEventListener('submit', handleSubmit);
      }
    };
  };

  return {
    form: formData,
    errors,
    enhance,
    submitting
  };
}
