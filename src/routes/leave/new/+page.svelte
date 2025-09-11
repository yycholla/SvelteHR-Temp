<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/services/auth';
  import { leaveService, myLeaveBalance } from '$lib/services/leaveService';
  import Button from '$lib/components/base/Button.svelte';
  import Input from '$lib/components/base/Input.svelte';
  import Select from '$lib/components/base/Select.svelte';
  import Textarea from '$lib/components/base/Textarea.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import { validateForm } from '$lib/utils/validation';
  import type { LeaveType, SubmitLeaveRequestInput } from '$lib/types';

  // Form data
  let formData = {
    type: '' as LeaveType | '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'MORNING' as 'MORNING' | 'AFTERNOON',
    emergencyContact: '',
    attachments: [] as string[]
  };

  let loading = false;
  let error: string | null = null;
  let validationErrors: Record<string, string> = {};
  let calculatedDays = 0;

  // Leave type options
  const leaveTypeOptions = [
    { value: 'VACATION', label: 'Vacation' },
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'MATERNITY', label: 'Maternity Leave' },
    { value: 'PATERNITY', label: 'Paternity Leave' },
    { value: 'BEREAVEMENT', label: 'Bereavement' },
    { value: 'OTHER', label: 'Other' }
  ];

  const halfDayOptions = [
    { value: 'MORNING', label: 'Morning (First Half)' },
    { value: 'AFTERNOON', label: 'Afternoon (Second Half)' }
  ];

  // Validation rules
  const validationRules = {
    type: { required: true },
    startDate: { required: true },
    endDate: { required: true },
    reason: { required: true, minLength: 10 }
  };

  // Computed values
  $: {
    const result = validateForm(formData, validationRules);
    validationErrors = result.errors;
  }

  $: isValid = Object.keys(validationErrors).length === 0 && formData.type && formData.startDate && formData.endDate;

  // Calculate days when dates change
  $: if (formData.startDate && formData.endDate) {
    calculateLeaveDays();
  }

  function calculateLeaveDays() {
    if (!formData.startDate || !formData.endDate) {
      calculatedDays = 0;
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (start > end) {
      calculatedDays = 0;
      return;
    }

    // Basic calculation - would need to account for weekends and holidays
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    if (formData.isHalfDay) {
      calculatedDays = 0.5;
    } else {
      calculatedDays = daysDiff;
    }
  }

  function getAvailableBalance(leaveType: LeaveType): number {
    if (!$myLeaveBalance) return 0;
    
    const balance = $myLeaveBalance.find(b => b.type === leaveType);
    return balance?.remaining || 0;
  }

  function getLeaveTypeDescription(leaveType: LeaveType): string {
    const descriptions = {
      VACATION: 'Planned time off for rest and recreation',
      SICK: 'Medical leave for illness or injury',
      PERSONAL: 'Personal time off for individual needs',
      MATERNITY: 'Maternity leave for new mothers',
      PATERNITY: 'Paternity leave for new fathers',
      BEREAVEMENT: 'Time off due to loss of family member',
      OTHER: 'Other types of leave not covered above'
    };
    return descriptions[leaveType] || '';
  }

  async function handleSubmit() {
    if (!isValid) return;

    try {
      loading = true;
      error = null;

      const submitData: SubmitLeaveRequestInput = {
        type: formData.type as LeaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? formData.halfDayPeriod : undefined,
        emergencyContact: formData.emergencyContact || undefined,
        attachments: formData.attachments.length > 0 ? formData.attachments : undefined
      };

      const leaveRequest = await leaveService.submitLeaveRequest(submitData);
      
      // Redirect to the new leave request details
      goto(`/leave/requests/${leaveRequest.id}`);
    } catch (err: any) {
      error = err.message || 'Failed to submit leave request';
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    goto('/leave/requests');
  }

  function handleReset() {
    formData = {
      type: '',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      halfDayPeriod: 'MORNING',
      emergencyContact: '',
      attachments: []
    };
    calculatedDays = 0;
    error = null;
  }

  onMount(() => {
    // Load leave balance
    leaveService.loadMyLeaveBalance();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.querySelector('input[name="startDate"]') as HTMLInputElement;
    const endDateInput = document.querySelector('input[name="endDate"]') as HTMLInputElement;
    
    if (startDateInput) startDateInput.min = today;
    if (endDateInput) endDateInput.min = today;
  });
</script>

<svelte:head>
  <title>Request Leave - MountainHR</title>
  <meta name="description" content="Submit a new leave request" />
</svelte:head>

<div class="new-leave-page">
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">Request Leave</h1>
      <p class="page-header__subtitle">
        Submit a new leave request for approval.
      </p>
    </div>

    <div class="page-header__actions">
      <Button
        variant="tertiary"
        leftIcon="arrow-left"
        on:click={handleCancel}
      >
        Back to Requests
      </Button>
    </div>
  </div>

  <!-- Leave Balance Summary -->
  {#if $myLeaveBalance && $myLeaveBalance.length > 0}
    <Card padding="md" class="balance-card">
      <div class="balance-header">
        <h3 class="balance-title">Your Leave Balance</h3>
      </div>
      <div class="balance-grid">
        {#each $myLeaveBalance as balance}
          <div class="balance-item">
            <div class="balance-type">{balance.type}</div>
            <div class="balance-remaining">{balance.remaining} days</div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  {#if error}
    <Card padding="md" class="error-card">
      <div class="error-message">
        <div class="error-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <div class="error-content">
          <h3 class="error-title">Error Submitting Request</h3>
          <p class="error-description">{error}</p>
        </div>
      </div>
    </Card>
  {/if}

  <!-- Leave Request Form -->
  <form on:submit|preventDefault={handleSubmit} class="leave-form">
    <Card padding="lg">
      <div class="form-section">
        <h3 class="form-section__title">Leave Details</h3>
        
        <div class="form-grid">
          <div class="form-field form-field--full-width">
            <Select
              label="Leave Type"
              options={leaveTypeOptions}
              bind:value={formData.type}
              required
              errorText={validationErrors.type}
              placeholder="Select leave type"
            />
            
            {#if formData.type}
              <div class="leave-type-info">
                <div class="info-description">
                  {getLeaveTypeDescription(formData.type)}
                </div>
                <div class="info-balance">
                  Available: {getAvailableBalance(formData.type)} days
                </div>
              </div>
            {/if}
          </div>

          <div class="form-field">
            <Input
              label="Start Date"
              type="date"
              name="startDate"
              bind:value={formData.startDate}
              required
              errorText={validationErrors.startDate}
            />
          </div>

          <div class="form-field">
            <Input
              label="End Date"
              type="date"
              name="endDate"
              bind:value={formData.endDate}
              required
              errorText={validationErrors.endDate}
            />
          </div>

          <div class="form-field form-field--checkbox">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={formData.isHalfDay}
                class="checkbox-input"
              />
              <span class="checkbox-text">Half Day Leave</span>
            </label>
          </div>

          {#if formData.isHalfDay}
            <div class="form-field">
              <Select
                label="Half Day Period"
                options={halfDayOptions}
                bind:value={formData.halfDayPeriod}
                required
              />
            </div>
          {/if}

          <div class="form-field form-field--full-width">
            <Textarea
              label="Reason"
              bind:value={formData.reason}
              required
              errorText={validationErrors.reason}
              placeholder="Please provide a detailed reason for your leave request..."
              rows={4}
              helperText="Minimum 10 characters required"
            />
          </div>

          <div class="form-field form-field--full-width">
            <Input
              label="Emergency Contact (Optional)"
              bind:value={formData.emergencyContact}
              placeholder="Contact person during your absence"
              helperText="Phone number or email of someone who can be reached in case of emergency"
            />
          </div>
        </div>
      </div>
    </Card>

    <!-- Leave Summary -->
    <Card padding="lg" class="summary-card">
      <div class="summary-section">
        <h3 class="summary-title">Leave Summary</h3>
        
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Leave Type:</span>
            <span class="summary-value">
              {formData.type ? leaveTypeOptions.find(opt => opt.value === formData.type)?.label || formData.type : 'Not selected'}
            </span>
          </div>

          <div class="summary-item">
            <span class="summary-label">Duration:</span>
            <span class="summary-value">
              {formData.startDate && formData.endDate 
                ? `${formData.startDate} to ${formData.endDate}` 
                : 'Dates not selected'}
            </span>
          </div>

          <div class="summary-item">
            <span class="summary-label">Total Days:</span>
            <span class="summary-value summary-value--highlight">
              {calculatedDays} day{calculatedDays !== 1 ? 's' : ''}
            </span>
          </div>

          {#if formData.type && getAvailableBalance(formData.type) < calculatedDays}
            <div class="summary-item summary-item--warning">
              <span class="summary-label">⚠️ Balance Warning:</span>
              <span class="summary-value">
                Insufficient balance ({getAvailableBalance(formData.type)} days available)
              </span>
            </div>
          {/if}
        </div>
      </div>
    </Card>

    <!-- Form Actions -->
    <div class="form-actions">
      <div class="form-actions__left">
        <Button
          type="button"
          variant="ghost"
          on:click={handleReset}
          disabled={loading}
        >
          Reset
        </Button>
      </div>

      <div class="form-actions__right">
        <Button
          type="button"
          variant="tertiary"
          on:click={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || loading}
          {loading}
        >
          Submit Request
        </Button>
      </div>
    </div>
  </form>
</div>

<style lang="postcss">
  .new-leave-page {
    @apply space-y-6 max-w-4xl mx-auto;
  }

  /* Page Header */
  .page-header {
    @apply flex items-start justify-between;
  }

  .page-header__content {
    @apply space-y-2;
  }

  .page-header__title {
    @apply text-3xl font-bold text-gray-900;
  }

  .page-header__subtitle {
    @apply text-lg text-gray-600;
  }

  .page-header__actions {
    @apply flex items-center space-x-3;
  }

  /* Balance Card */
  .balance-header {
    @apply mb-4;
  }

  .balance-title {
    @apply text-lg font-semibold text-gray-900;
  }

  .balance-grid {
    @apply grid grid-cols-2 md:grid-cols-4 gap-4;
  }

  .balance-item {
    @apply text-center p-3 bg-gray-50 rounded-lg;
  }

  .balance-type {
    @apply text-sm font-medium text-gray-600 uppercase tracking-wide;
  }

  .balance-remaining {
    @apply text-2xl font-bold text-gray-900 mt-1;
  }

  /* Error Card */
  .error-card {
    @apply border-l-4 border-red-500 bg-red-50;
  }

  .error-message {
    @apply flex items-start space-x-3;
  }

  .error-icon {
    @apply flex-shrink-0 text-red-500;
  }

  .error-icon i {
    @apply w-5 h-5;
  }

  .error-content {
    @apply flex-1;
  }

  .error-title {
    @apply text-sm font-medium text-red-900 mb-1;
  }

  .error-description {
    @apply text-sm text-red-700;
  }

  /* Form */
  .leave-form {
    @apply space-y-6;
  }

  .form-section {
    @apply space-y-6;
  }

  .form-section__title {
    @apply text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2;
  }

  .form-grid {
    @apply grid grid-cols-1 md:grid-cols-2 gap-4;
  }

  .form-field {
    @apply space-y-1;
  }

  .form-field--full-width {
    @apply md:col-span-2;
  }

  .form-field--checkbox {
    @apply flex items-center md:col-span-2;
  }

  /* Leave Type Info */
  .leave-type-info {
    @apply mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md;
  }

  .info-description {
    @apply text-sm text-blue-800;
  }

  .info-balance {
    @apply text-sm font-medium text-blue-900 mt-1;
  }

  /* Checkbox */
  .checkbox-label {
    @apply flex items-center space-x-2 cursor-pointer;
  }

  .checkbox-input {
    @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
  }

  .checkbox-text {
    @apply text-sm font-medium text-gray-700;
  }

  /* Summary Card */
  .summary-section {
    @apply space-y-4;
  }

  .summary-title {
    @apply text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2;
  }

  .summary-grid {
    @apply space-y-3;
  }

  .summary-item {
    @apply flex justify-between items-start;
  }

  .summary-item--warning {
    @apply bg-yellow-50 border border-yellow-200 rounded-md p-3 -mx-3;
  }

  .summary-label {
    @apply text-sm font-medium text-gray-600;
  }

  .summary-value {
    @apply text-sm text-gray-900 text-right;
  }

  .summary-value--highlight {
    @apply font-bold text-blue-600;
  }

  /* Form Actions */
  .form-actions {
    @apply flex justify-between items-center pt-6 border-t border-gray-200;
  }

  .form-actions__left {
    @apply flex items-center space-x-3;
  }

  .form-actions__right {
    @apply flex items-center space-x-3;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .new-leave-page {
      @apply max-w-none mx-4;
    }

    .page-header {
      @apply flex-col items-start space-y-4;
    }

    .form-grid {
      @apply grid-cols-1;
    }

    .form-field--full-width,
    .form-field--checkbox {
      @apply col-span-1;
    }

    .balance-grid {
      @apply grid-cols-2;
    }

    .form-actions {
      @apply flex-col space-y-4 items-stretch;
    }

    .form-actions__left,
    .form-actions__right {
      @apply justify-center;
    }
  }
</style>