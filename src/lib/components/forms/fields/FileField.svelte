<script lang="ts">
  import type { FormField } from '$lib/forms/types';
  import BaseField from './BaseField.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Upload, X, FileIcon } from 'lucide-svelte';
  
  export let field: FormField;
  export let value: File | File[] | null = null;
  export let errors: string[] | undefined = undefined;
  export let constraints: any = undefined;
  
  $: isMultiple = field.ui_config?.variant === 'multiple';
  $: acceptTypes = field.validation?.pattern || '*/*';
  $: maxSize = field.validation?.maxValue; // in bytes
  $: files = isMultiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
  
  let dragover = false;
  let fileInput: HTMLInputElement;
  
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      processFiles(Array.from(input.files));
    }
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragover = false;
    
    if (event.dataTransfer?.files) {
      processFiles(Array.from(event.dataTransfer.files));
    }
  }
  
  function processFiles(newFiles: File[]) {
    // Validate file size
    if (maxSize) {
      newFiles = newFiles.filter(file => {
        if (file.size > maxSize) {
          // Add error handling here if needed
          console.warn(`File ${file.name} exceeds maximum size`);
          return false;
        }
        return true;
      });
    }
    
    if (isMultiple) {
      value = [...files, ...newFiles];
    } else {
      value = newFiles[0] || null;
    }
  }
  
  function removeFile(index: number) {
    if (isMultiple && Array.isArray(value)) {
      value = value.filter((_, i) => i !== index);
    } else {
      value = null;
      if (fileInput) fileInput.value = '';
    }
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function openFileDialog() {
    fileInput?.click();
  }
  
  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    dragover = true;
  }
  
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    if (!event.currentTarget?.contains(event.relatedTarget as Node)) {
      dragover = false;
    }
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }
</script>

<BaseField {field} {errors} {constraints} {value} let:fieldId let:ariaDescribedBy let:hasError let:required>
  <div class="file-upload-container">
    <!-- Hidden file input -->
    <input
      bind:this={fileInput}
      type="file"
      id={fieldId}
      name={field.name}
      accept={acceptTypes}
      multiple={isMultiple}
      {required}
      aria-describedby={ariaDescribedBy}
      on:change={handleFileSelect}
      class="sr-only"
    />
    
    <!-- Drop zone -->
    <div
      class="file-drop-zone"
      class:dragover
      class:has-files={files.length > 0}
      class:border-destructive={hasError}
      on:click={openFileDialog}
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragenter={handleDragEnter}
      on:dragleave={handleDragLeave}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
    >
      {#if files.length === 0}
        <div class="drop-zone-empty">
          <Upload class="w-8 h-8 text-gray-400 mb-2" />
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <Button type="button" variant="link" class="p-0 h-auto font-medium">
              Choose files
            </Button>
            or drag and drop
          </p>
          {#if acceptTypes !== '*/*'}
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Accepted types: {acceptTypes}
            </p>
          {/if}
          {#if maxSize}
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Max size: {formatFileSize(maxSize)}
            </p>
          {/if}
        </div>
      {:else}
        <div class="selected-files">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Files:
          </p>
          <div class="file-list space-y-2">
            {#each files as file, index}
              <div class="file-item">
                <div class="file-info">
                  <FileIcon class="w-4 h-4 text-gray-500" />
                  <span class="file-name text-sm truncate">{file.name}</span>
                  <span class="file-size text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0"
                  on:click={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X class="w-3 h-3" />
                  <span class="sr-only">Remove {file.name}</span>
                </Button>
              </div>
            {/each}
          </div>
          {#if isMultiple}
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              class="mt-3"
              on:click={(e) => e.stopPropagation()}
              onclick={openFileDialog}
            >
              Add More Files
            </Button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</BaseField>

<style>
  .file-upload-container {
    width: 100%;
  }
  
  .file-drop-zone {
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background: transparent;
  }
  
  .file-drop-zone:hover {
    border-color: #9ca3af;
    background: #f9fafb;
  }
  
  .file-drop-zone.dragover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
  
  .file-drop-zone.has-files {
    text-align: left;
  }
  
  .drop-zone-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .selected-files {
    width: 100%;
  }
  
  .file-list {
    max-height: 200px;
    overflow-y: auto;
  }
  
  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    background: #f9fafb;
    border-radius: 0.375rem;
    gap: 0.5rem;
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }
  
  .file-name {
    flex: 1;
    min-width: 0;
  }
  
  .file-size {
    white-space: nowrap;
  }
  
  @media (prefers-color-scheme: dark) {
    .file-drop-zone:hover {
      background: #1f2937;
    }
    
    .file-drop-zone.dragover {
      background: #1e3a8a;
    }
    
    .file-item {
      background: #374151;
    }
  }
</style>