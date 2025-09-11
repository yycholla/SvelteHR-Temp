/**
 * Validation Utilities for MountainHR
 * 
 * Provides comprehensive validation functions for forms, user input,
 * and data integrity across the application.
 */

import type { ValidationRule, FormField } from '$lib/types';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors?: Record<string, string>;
}

// =============================================================================
// Core Validation Functions
// =============================================================================

export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
};

export const isEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const isDate = (date: string): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

export const isUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isAlphanumeric = (value: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(value);
};

export const isAlpha = (value: string): boolean => {
  return /^[a-zA-Z\s]+$/.test(value);
};

export const isNumeric = (value: string): boolean => {
  return /^[0-9]+$/.test(value);
};

export const isDecimal = (value: string): boolean => {
  return /^[0-9]+(\.[0-9]+)?$/.test(value);
};

// =============================================================================
// Business Logic Validations
// =============================================================================

export const isValidPassword = (password: string): { 
  isValid: boolean; 
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
} => {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common password check
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
    score = Math.max(0, score - 2);
  }

  // Sequential characters check
  if (hasSequentialChars(password)) {
    errors.push('Password should not contain sequential characters');
    score = Math.max(0, score - 1);
  }

  const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  
  return {
    isValid: errors.length === 0,
    strength,
    errors
  };
};

const hasSequentialChars = (password: string): boolean => {
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    
    if (char2 === char1 + 1 && char3 === char2 + 1) {
      return true;
    }
  }
  return false;
};

export const isValidSSN = (ssn: string): boolean => {
  const cleaned = ssn.replace(/\D/g, '');
  return cleaned.length === 9 && !/^000|666|9\d{2}/.test(cleaned);
};

export const isValidEmployeeId = (id: string): boolean => {
  // Format: EMP-YYYY-NNNN (e.g., EMP-2025-0001)
  return /^EMP-\d{4}-\d{4}$/.test(id);
};

export const isValidDepartmentCode = (code: string): boolean => {
  // Format: 2-5 uppercase letters
  return /^[A-Z]{2,5}$/.test(code);
};

export const isBusinessEmail = (email: string): boolean => {
  if (!isEmail(email)) return false;
  
  // Check against common personal email domains
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'protonmail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return !personalDomains.includes(domain);
};

export const isValidSalary = (salary: number): boolean => {
  // Reasonable salary range: $15,000 - $1,000,000
  return salary >= 15000 && salary <= 1000000;
};

export const isValidHourlyRate = (rate: number): boolean => {
  // Reasonable hourly rate: $7.25 - $200
  return rate >= 7.25 && rate <= 200;
};

// =============================================================================
// Date Validations
// =============================================================================

export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

export const isValidBirthDate = (birthDate: string): boolean => {
  const birth = new Date(birthDate);
  const now = new Date();
  const age = now.getFullYear() - birth.getFullYear();
  
  // Must be at least 16 years old and not more than 100
  return age >= 16 && age <= 100;
};

export const isValidHireDate = (hireDate: string): boolean => {
  const hire = new Date(hireDate);
  const now = new Date();
  const past = new Date();
  past.setFullYear(past.getFullYear() - 50); // 50 years ago
  
  return hire >= past && hire <= now;
};

export const isWorkingDay = (date: string): boolean => {
  const day = new Date(date).getDay();
  return day >= 1 && day <= 5; // Monday to Friday
};

export const isFutureDate = (date: string): boolean => {
  return new Date(date) > new Date();
};

export const isPastDate = (date: string): boolean => {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj < today;
};

// =============================================================================
// File Validations
// =============================================================================

export const isValidFileType = (
  filename: string, 
  allowedTypes: string[]
): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
};

export const isValidFileSize = (
  fileSize: number, 
  maxSizeInMB: number
): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize <= maxSizeInBytes;
};

export const isValidImageFile = (filename: string): boolean => {
  return isValidFileType(filename, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
};

export const isValidDocumentFile = (filename: string): boolean => {
  return isValidFileType(filename, ['pdf', 'doc', 'docx', 'txt', 'rtf']);
};

export const isValidSpreadsheetFile = (filename: string): boolean => {
  return isValidFileType(filename, ['xls', 'xlsx', 'csv']);
};

// =============================================================================
// Form Validation Engine
// =============================================================================

export const validateField = (
  value: any,
  rules: ValidationRule,
  fieldName: string = 'Field'
): string[] => {
  const errors: string[] = [];

  // Required validation
  if (rules.required && !isRequired(value)) {
    errors.push(`${fieldName} is required`);
    return errors; // Don't validate further if required field is empty
  }

  // Skip other validations if value is empty and not required
  if (!isRequired(value)) {
    return errors;
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`);
    }

    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} must not exceed ${rules.max}`);
    }
  }

  // Custom validation
  if (rules.custom) {
    const customResult = rules.custom(value);
    if (typeof customResult === 'string') {
      errors.push(customResult);
    } else if (customResult === false) {
      errors.push(`${fieldName} is invalid`);
    }
  }

  return errors;
};

export const validateForm = (
  fields: { [key: string]: FormField }
): { 
  isValid: boolean; 
  errors: { [key: string]: string[] };
  firstErrorField?: string;
} => {
  const errors: { [key: string]: string[] } = {};
  let firstErrorField: string | undefined;

  Object.entries(fields).forEach(([fieldName, field]) => {
    if (field.rules) {
      const fieldErrors = validateField(field.value, field.rules, field.label);
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
        if (!firstErrorField) {
          firstErrorField = fieldName;
        }
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstErrorField
  };
};

// =============================================================================
// Predefined Validation Rules
// =============================================================================

export const ValidationRules = {
  required: { required: true } as ValidationRule,
  
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => isEmail(value) || 'Please enter a valid email address'
  } as ValidationRule,

  businessEmail: {
    required: true,
    custom: (value: string) => isBusinessEmail(value) || 'Please enter a business email address'
  } as ValidationRule,

  phone: {
    required: true,
    custom: (value: string) => isPhone(value) || 'Please enter a valid phone number'
  } as ValidationRule,

  password: {
    required: true,
    minLength: 8,
    custom: (value: string) => {
      const result = isValidPassword(value);
      return result.isValid || result.errors[0];
    }
  } as ValidationRule,

  ssn: {
    required: true,
    custom: (value: string) => isValidSSN(value) || 'Please enter a valid Social Security Number'
  } as ValidationRule,

  salary: {
    required: true,
    min: 15000,
    max: 1000000,
    custom: (value: number) => isValidSalary(value) || 'Please enter a valid salary amount'
  } as ValidationRule,

  date: {
    required: true,
    custom: (value: string) => isDate(value) || 'Please enter a valid date'
  } as ValidationRule,

  pastDate: {
    required: true,
    custom: (value: string) => isPastDate(value) || 'Date must be in the past'
  } as ValidationRule,

  futureDate: {
    required: true,
    custom: (value: string) => isFutureDate(value) || 'Date must be in the future'
  } as ValidationRule,

  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-'\.]+$/
  } as ValidationRule,

  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/
  } as ValidationRule,

  departmentCode: {
    required: true,
    minLength: 2,
    maxLength: 5,
    pattern: /^[A-Z]+$/
  } as ValidationRule,

  url: {
    required: true,
    custom: (value: string) => isUrl(value) || 'Please enter a valid URL'
  } as ValidationRule,

  positiveNumber: {
    required: true,
    min: 0.01,
    custom: (value: number) => value > 0 || 'Value must be greater than 0'
  } as ValidationRule,

  percentage: {
    required: true,
    min: 0,
    max: 100,
    custom: (value: number) => (value >= 0 && value <= 100) || 'Value must be between 0 and 100'
  } as ValidationRule
};

// =============================================================================
// Utility Functions
// =============================================================================

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const formatSSN = (ssn: string): string => {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }
  return cleaned;
};

export const maskSSN = (ssn: string): string => {
  const formatted = formatSSN(ssn);
  if (formatted.length === 11) {
    return `XXX-XX-${formatted.slice(-4)}`;
  }
  return 'XXX-XX-XXXX';
};

export const debounceValidation = (
  validationFn: Function,
  delay: number = 300
): Function => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    
    return new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(validationFn(...args));
      }, delay);
    });
  };
};

export default {
  isRequired,
  isEmail,
  isPhone,
  isDate,
  isValidPassword,
  validateField,
  validateForm,
  ValidationRules,
  sanitizeInput,
  normalizeEmail,
  debounceValidation
};