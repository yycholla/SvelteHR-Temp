<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { onboardingService, onboardingTemplates } from '$lib/services/onboardingService';
  import { userService, users } from '$lib/services/userService';
  import { currentUser, hasPermission } from '$lib/services/auth';
  import Button from '$lib/components/base/Button.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import Select from '$lib/components/base/Select.svelte';
  import Input from '$lib/components/base/Input.svelte';
  import Textarea from '$lib/components/base/Textarea.svelte';

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser || !hasPermission('onboarding:create')) {
      goto('/onboarding');
      return;
    }

    // Load required data
    onboardingService.loadTemplates();
    userService.loadUsers({ reset: true });
  });

  // Form state
  let selectedStep = 1;
  let formData = {
    employee_id: '',
    template_id: '',
    start_date: new Date().toISOString().split('T')[0],
    assigned_buddy_id: '',
    hr_contact_id: '',
    manager_id: '',
    notes: ''
  };

  let isSubmitting = false;
  let errors: Record<string, string> = {};

  // Options for dropdowns
  $: employeeOptions = $users
    .filter(user => user.onboarding_status === 'PreHire')
    .map(user => ({
      value: user.id,
      label: user.display_name || user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }));

  $: templateOptions = $onboardingTemplates.map(template => ({
    value: template.id,
    label: `${template.name} (${template.estimated_duration_days} days)`
  }));

  $: buddyOptions = [
    { value: '', label: 'No buddy assigned' },
    ...$users
      .filter(user => user.is_active && user.id !== formData.employee_id)
      .map(user => ({
        value: user.id,
        label: user.display_name || user.displayName || 'Unknown User'
      }))
  ];

  $: managerOptions = [
    { value: '', label: 'No manager assigned' },
    ...$users
      .filter(user => user.is_active && user.id !== formData.employee_id)
      .map(user => ({
        value: user.id,
        label: user.display_name || user.displayName || 'Unknown User'
      }))
  ];

  $: hrOptions = [
    { value: '', label: 'No HR contact assigned' },
    ...$users
      .filter(user => user.is_active && user.id !== formData.employee_id)
      .map(user => ({
        value: user.id,
        label: user.display_name || user.displayName || 'Unknown User'
      }))
  ];

  function validateStep(step: number): boolean {
    errors = {};

    if (step === 1) {
      if (!formData.employee_id) {
        errors.employee_id = 'Please select an employee';
      }
      if (!formData.template_id) {
        errors.template_id = 'Please select an onboarding template';
      }
      if (!formData.start_date) {
        errors.start_date = 'Please select a start date';
      }
    }

    return Object.keys(errors).length === 0;
  }

  function nextStep() {
    if (validateStep(selectedStep)) {
      selectedStep++;
    }
  }

  function previousStep() {
    selectedStep--;
  }

  async function handleSubmit() {
    if (!validateStep(1) || !validateStep(2)) return;

    isSubmitting = true;

    try {
      const result = await onboardingService.createInstance({
        employee_id: formData.employee_id,
        template_id: formData.template_id,
        start_date: formData.start_date,
        assigned_buddy_id: formData.assigned_buddy_id || undefined,
        hr_contact_id: formData.hr_contact_id || undefined,
        manager_id: formData.manager_id || undefined,
        notes: formData.notes.trim() || undefined
      });

      // Navigate to the new onboarding instance
      goto(`/onboarding/${result.id}`);
    } catch (error: any) {
      errors.submit = error.message || 'Failed to create onboarding instance';
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    goto('/onboarding');
  }

  $: selectedEmployee = $users.find(u => u.id === formData.employee_id);
  $: selectedTemplate = $onboardingTemplates.find(t => t.id === formData.template_id);
</script>

<svelte:head>
  <title>Start Onboarding - MountainHR</title>
  <meta name="description" content="Start a new employee onboarding process" />
</svelte:head>

<div class="new-onboarding-page">
  <div class="page-header">
    <div class="breadcrumb">
      <Button
        variant="ghost"
        size="sm"
        leftIcon="arrow-left"
        on:click={() => goto('/onboarding')}
      >
        Back to Onboarding
      </Button>
    </div>
  </div>

  <Card padding="lg" class="onboarding-wizard">
    <div class="wizard-header">
      <h1 class="text-2xl font-bold text-gray-900">Start Employee Onboarding</h1>
      <p class="text-sm text-gray-600 mt-1">
        Create a new onboarding workflow for an employee
      </p>

      <!-- Progress Steps -->
      <div class="steps-progress">
        <div class="step" class:active={selectedStep === 1} class:completed={selectedStep > 1}>
          <div class="step-number">1</div>
          <div class="step-label">Employee & Template</div>
        </div>
        <div class="step-connector" class:completed={selectedStep > 1}></div>
        <div class="step" class:active={selectedStep === 2} class:completed={selectedStep > 2}>
          <div class="step-number">2</div>
          <div class="step-label">Team Assignment</div>
        </div>
        <div class="step-connector" class:completed={selectedStep > 2}></div>
        <div class="step" class:active={selectedStep === 3} class:completed={selectedStep > 3}>
          <div class="step-number">3</div>
          <div class="step-label">Review & Create</div>
        </div>
      </div>
    </div>

    <div class="wizard-content">
      {#if selectedStep === 1}
        <!-- Step 1: Employee & Template Selection -->
        <div class="step-content">
          <h2 class="step-title">Select Employee and Template</h2>
          
          <div class="form-grid">
            <div class="form-group">
              <Select
                label="Employee"
                options={employeeOptions}
                bind:value={formData.employee_id}
                error={errors.employee_id}
                placeholder="Select employee to onboard"
                required
              />
              <p class="form-help">Only employees with 'PreHire' status are shown</p>
            </div>

            <div class="form-group">
              <Select
                label="Onboarding Template"
                options={templateOptions}
                bind:value={formData.template_id}
                error={errors.template_id}
                placeholder="Select onboarding template"
                required
              />
              {#if selectedTemplate}
                <p class="form-help">
                  {selectedTemplate.description} - Estimated duration: {selectedTemplate.estimated_duration_days} days
                </p>
              {/if}
            </div>

            <div class="form-group">
              <Input
                type="date"
                label="Start Date"
                bind:value={formData.start_date}
                error={errors.start_date}
                required
              />
            </div>
          </div>
        </div>

      {:else if selectedStep === 2}
        <!-- Step 2: Team Assignment -->
        <div class="step-content">
          <h2 class="step-title">Assign Team Members</h2>
          <p class="step-description">
            Assign team members to help with the onboarding process
          </p>
          
          <div class="form-grid">
            <div class="form-group">
              <Select
                label="Onboarding Buddy"
                options={buddyOptions}
                bind:value={formData.assigned_buddy_id}
                placeholder="Select onboarding buddy (optional)"
              />
              <p class="form-help">A buddy to help guide the new employee</p>
            </div>

            <div class="form-group">
              <Select
                label="HR Contact"
                options={hrOptions}
                bind:value={formData.hr_contact_id}
                placeholder="Select HR contact (optional)"
              />
              <p class="form-help">HR representative responsible for this onboarding</p>
            </div>

            <div class="form-group">
              <Select
                label="Direct Manager"
                options={managerOptions}
                bind:value={formData.manager_id}
                placeholder="Select direct manager (optional)"
              />
              <p class="form-help">The employee's direct supervisor</p>
            </div>

            <div class="form-group full-width">
              <Textarea
                label="Notes"
                bind:value={formData.notes}
                placeholder="Any special instructions or notes for this onboarding..."
                rows="4"
              />
            </div>
          </div>
        </div>

      {:else if selectedStep === 3}
        <!-- Step 3: Review & Create -->
        <div class="step-content">
          <h2 class="step-title">Review and Create</h2>
          <p class="step-description">
            Review the onboarding details and create the workflow
          </p>

          <div class="review-section">
            <div class="review-group">
              <h3 class="review-title">Employee Information</h3>
              <div class="review-details">
                <div class="review-item">
                  <span class="review-label">Employee:</span>
                  <span class="review-value">{selectedEmployee?.display_name || 'Unknown'}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">Start Date:</span>
                  <span class="review-value">{new Date(formData.start_date).toLocaleDateString()}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">Template:</span>
                  <span class="review-value">{selectedTemplate?.name || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div class="review-group">
              <h3 class="review-title">Team Assignment</h3>
              <div class="review-details">
                <div class="review-item">
                  <span class="review-label">Buddy:</span>
                  <span class="review-value">
                    {formData.assigned_buddy_id ? 
                      $users.find(u => u.id === formData.assigned_buddy_id)?.display_name || 'Unknown' : 
                      'Not assigned'}
                  </span>
                </div>
                <div class="review-item">
                  <span class="review-label">HR Contact:</span>
                  <span class="review-value">
                    {formData.hr_contact_id ? 
                      $users.find(u => u.id === formData.hr_contact_id)?.display_name || 'Unknown' : 
                      'Not assigned'}
                  </span>
                </div>
                <div class="review-item">
                  <span class="review-label">Manager:</span>
                  <span class="review-value">
                    {formData.manager_id ? 
                      $users.find(u => u.id === formData.manager_id)?.display_name || 'Unknown' : 
                      'Not assigned'}
                  </span>
                </div>
                {#if formData.notes}
                  <div class="review-item">
                    <span class="review-label">Notes:</span>
                    <span class="review-value">{formData.notes}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          {#if errors.submit}
            <div class="error-message">
              <i class="icon-alert-circle text-red-500 w-5 h-5"></i>
              <span class="error-text">{errors.submit}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="wizard-footer">
      <div class="footer-actions">
        <Button
          variant="secondary"
          on:click={selectedStep === 1 ? handleCancel : previousStep}
          disabled={isSubmitting}
        >
          {selectedStep === 1 ? 'Cancel' : 'Previous'}
        </Button>

        {#if selectedStep < 3}
          <Button
            variant="primary"
            on:click={nextStep}
            disabled={isSubmitting}
          >
            Next
          </Button>
        {:else}
          <Button
            variant="primary"
            leftIcon="check"
            on:click={handleSubmit}
            loading={isSubmitting}
          >
            Create Onboarding
          </Button>
        {/if}
      </div>
    </div>
  </Card>
</div>

<style lang="postcss">
  .new-onboarding-page {
    @apply w-full space-y-6;
  }

  .page-header {
    @apply flex items-center justify-between;
  }

  .onboarding-wizard {
    @apply max-w-4xl mx-auto;
  }

  /* Wizard Header */
  .wizard-header {
    @apply border-b pb-6 mb-8;
  }

  .wizard-header h1 {
    @apply text-2xl font-bold text-gray-900;
  }

  .wizard-header p {
    @apply text-sm text-gray-600 mt-1;
  }

  /* Steps Progress */
  .steps-progress {
    @apply flex items-center justify-center mt-8;
  }

  .step {
    @apply flex flex-col items-center;
  }

  .step-number {
    @apply w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-sm transition-colors;
  }

  .step.active .step-number {
    @apply bg-blue-600 text-white;
  }

  .step.completed .step-number {
    @apply bg-green-600 text-white;
  }

  .step-label {
    @apply text-xs font-medium text-gray-500 mt-2 text-center;
  }

  .step.active .step-label {
    @apply text-blue-600;
  }

  .step.completed .step-label {
    @apply text-green-600;
  }

  .step-connector {
    @apply h-px bg-gray-200 flex-1 mx-4;
  }

  .step-connector.completed {
    @apply bg-green-600;
  }

  /* Wizard Content */
  .wizard-content {
    @apply mb-8;
  }

  .step-content {
    @apply space-y-6;
  }

  .step-title {
    @apply text-xl font-semibold text-gray-900;
  }

  .step-description {
    @apply text-sm text-gray-600;
  }

  /* Form */
  .form-grid {
    @apply grid grid-cols-1 md:grid-cols-2 gap-6;
  }

  .form-group {
    @apply space-y-2;
  }

  .form-group.full-width {
    @apply md:col-span-2;
  }

  .form-help {
    @apply text-xs text-gray-500;
  }

  /* Review Section */
  .review-section {
    @apply space-y-6;
  }

  .review-group {
    @apply space-y-3;
  }

  .review-title {
    @apply text-lg font-medium text-gray-900 border-b pb-2;
  }

  .review-details {
    @apply space-y-2;
  }

  .review-item {
    @apply flex items-center justify-between py-1;
  }

  .review-label {
    @apply text-sm font-medium text-gray-600;
  }

  .review-value {
    @apply text-sm text-gray-900;
  }

  /* Error Message */
  .error-message {
    @apply flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md;
  }

  .error-text {
    @apply text-sm text-red-700;
  }

  /* Wizard Footer */
  .wizard-footer {
    @apply border-t pt-6;
  }

  .footer-actions {
    @apply flex items-center justify-end space-x-3;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .form-grid {
      @apply grid-cols-1;
    }

    .steps-progress {
      @apply space-y-2;
    }

    .step-connector {
      @apply hidden;
    }

    .footer-actions {
      @apply flex-col-reverse items-stretch space-x-0 space-y-3 space-y-reverse;
    }
  }
</style>