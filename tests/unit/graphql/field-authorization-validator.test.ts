/**
 * Field Authorization Validator Tests
 *
 * Tests for GraphQL field-level authorization validation and security controls.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { parse, buildSchema } from 'graphql';
import {
  FieldAuthorizationValidator,
  createPostGraphileAuthorizationValidator
} from '$lib/graphql/field-authorization-validator';
import type {
  AuthorizationContext,
  FieldPermissionRule
} from '$lib/graphql/field-authorization-validator';

// Extended test schema with sensitive fields
const testSchema = buildSchema(`
  type Query {
    users: [User!]!
    currentUser: User
    employees: [Employee!]!
    departments: [Department!]!
    auditLog: [AuditEntry!]!
    systemSettings: SystemSettings
  }

  type User {
    id: ID!
    name: String!
    email: String!
    salary: Float
    personalData: PersonalData
    permissions: [Permission!]!
    department: Department!
    managedEmployees: [Employee!]!
  }

  type PersonalData {
    ssn: String
    address: Address
    emergencyContact: Contact
    medicalInfo: MedicalInfo
  }

  type Address {
    street: String!
    city: String!
    country: String!
  }

  type Contact {
    name: String!
    phone: String!
    relationship: String!
  }

  type MedicalInfo {
    bloodType: String
    allergies: [String!]
    medications: [String!]
  }

  type Employee {
    id: ID!
    user: User!
    department: Department!
    manager: Employee
    performanceScore: Float
    disciplinaryActions: [DisciplinaryAction!]!
    leaveRequests: [LeaveRequest!]!
    performanceReviews: [PerformanceReview!]!
  }

  type Department {
    id: ID!
    name: String!
    employees: [Employee!]!
    manager: Employee
    budget: Float
    strategicPlans: [StrategicPlan!]!
  }

  type PerformanceReview {
    id: ID!
    employee: Employee!
    reviewer: Employee!
    score: Float!
    confidentialNotes: String
    publicComments: String
  }

  type LeaveRequest {
    id: ID!
    employee: Employee!
    type: LeaveType!
    medicalDocuments: [Document!]!
    approver: Employee
  }

  type DisciplinaryAction {
    id: ID!
    employee: Employee!
    type: String!
    description: String!
    confidential: Boolean!
  }

  type Document {
    id: ID!
    name: String!
    type: DocumentType!
    sensitive: Boolean!
  }

  type StrategicPlan {
    id: ID!
    title: String!
    confidentialityLevel: String!
  }

  type Permission {
    id: ID!
    name: String!
    scope: String!
  }

  type AuditEntry {
    id: ID!
    action: String!
    userId: String!
    timestamp: String!
    details: String!
  }

  type SystemSettings {
    id: ID!
    key: String!
    value: String!
    sensitive: Boolean!
  }

  enum LeaveType {
    VACATION
    SICK
    MEDICAL
    PARENTAL
  }

  enum DocumentType {
    GENERAL
    MEDICAL
    FINANCIAL
    CONFIDENTIAL
  }
`);

// Test contexts for different user roles
const adminContext: AuthorizationContext = {
  userId: 'admin-1',
  userRoles: ['Admin'],
  userPermissions: ['*', 'salary:read', 'personal_data:read', 'permissions:read', 'audit:read'],
  isAdmin: true
};

const hrManagerContext: AuthorizationContext = {
  userId: 'hr-1',
  userRoles: ['HR_Manager'],
  userPermissions: ['salary:read', 'personal_data:read', 'performance:read', 'disciplinary:read'],
  departmentId: 'dept-1',
  isAdmin: false
};

const managerContext: AuthorizationContext = {
  userId: 'manager-1',
  userRoles: ['Manager'],
  userPermissions: ['performance:read', 'budget:read'],
  departmentId: 'dept-1',
  managerId: 'manager-1',
  isAdmin: false
};

const employeeContext: AuthorizationContext = {
  userId: 'emp-1',
  userRoles: ['Employee'],
  userPermissions: ['profile:read'],
  departmentId: 'dept-1',
  isAdmin: false
};

// Custom permission rules for testing
const customTestRules: FieldPermissionRule[] = [
  {
    fieldPath: 'PersonalData.medicalInfo',
    requiredPermissions: ['medical_data:read'],
    requiredRoles: ['HR_Manager', 'Admin'],
    sensitivityLevel: 'restricted',
    conditions: [{
      type: 'ownership',
      field: 'userId',
      operator: 'equals',
      value: 'userId'
    }]
  },
  {
    fieldPath: 'Document.sensitive',
    requiredPermissions: ['sensitive_docs:read'],
    requiredRoles: ['Manager', 'HR_Manager', 'Admin'],
    sensitivityLevel: 'confidential'
  }
];

describe('FieldAuthorizationValidator', () => {
  let validator: FieldAuthorizationValidator;

  beforeEach(() => {
    validator = new FieldAuthorizationValidator({}, testSchema, customTestRules);
  });

  describe('Basic Authorization Validation', () => {
    test('should allow admin full access to all fields', () => {
      const query = parse(`
        query AdminQuery {
          users {
            id
            name
            salary
            personalData {
              ssn
              medicalInfo {
                bloodType
                allergies
              }
            }
            permissions {
              name
              scope
            }
          }
          systemSettings {
            key
            value
            sensitive
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, adminContext);

      expect(result.isAuthorized).toBe(true);
      expect(result.deniedFields.length).toBe(0);
      expect(result.securityLevel).toBeOneOf(['low', 'medium', 'high']); // Depends on sensitivity analysis
    });

    test('should deny employee access to sensitive fields', () => {
      const query = parse(`
        query EmployeeQuery {
          users {
            id
            name
            salary
            permissions {
              name
            }
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      expect(result.isAuthorized).toBe(false);
      expect(result.deniedFields.length).toBeGreaterThan(0);
      expect(result.deniedFields).toContain('User.salary');
      expect(result.deniedFields).toContain('User.permissions');
    });

    test('should allow HR manager access to HR-related sensitive fields', () => {
      const query = parse(`
        query HRQuery {
          employees {
            id
            performanceScore
            disciplinaryActions {
              type
              description
            }
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, hrManagerContext);

      expect(result.isAuthorized).toBe(true);
      expect(result.deniedFields.length).toBe(0);
    });

    test('should allow manager access to department budget', () => {
      const query = parse(`
        query ManagerQuery {
          departments {
            id
            name
            budget
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, managerContext);

      expect(result.isAuthorized).toBe(true);
      expect(result.deniedFields.length).toBe(0);
    });
  });

  describe('Conditional Access Rules', () => {
    test('should allow ownership-based access to personal data', () => {
      // Employee accessing their own personal data
      const query = parse(`
        query PersonalDataQuery {
          currentUser {
            id
            personalData {
              ssn
              address {
                street
                city
              }
            }
          }
        }
      `);

      const ownContext: AuthorizationContext = {
        ...employeeContext,
        userPermissions: [...employeeContext.userPermissions, 'personal_data:read']
      };

      const result = validator.validateQueryAuthorization(
        query,
        ownContext,
        { userId: 'emp-1' }
      );

      expect(result.isAuthorized).toBe(true);
      expect(result.fieldResults.some(f => f.conditionalAccess)).toBe(true);
    });

    test('should deny access to personal data of other users', () => {
      const query = parse(`
        query OtherPersonalData {
          users {
            personalData {
              ssn
            }
          }
        }
      `);

      const result = validator.validateQueryAuthorization(
        query,
        employeeContext,
        { userId: 'other-user' }
      );

      expect(result.isAuthorized).toBe(false);
      expect(result.deniedFields).toContain('User.personalData');
    });

    test('should handle role hierarchy conditions', () => {
      const query = parse(`
        query ManagerAccess {
          employees {
            id
            performanceScore
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, managerContext);

      // Manager should have access to performance scores of their direct reports
      const performanceAccess = result.fieldResults.find(f =>
        f.fieldPath.includes('performanceScore')
      );

      expect(performanceAccess?.conditionalAccess).toBe(true);
    });
  });

  describe('Sensitivity Level Analysis', () => {
    test('should identify sensitive fields in query', () => {
      const query = parse(`
        query SensitiveQuery {
          users {
            salary
            permissions {
              name
            }
          }
          systemSettings {
            key
            sensitive
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, hrManagerContext);

      expect(result.sensitiveFieldsAccessed.length).toBeGreaterThan(0);
      expect(result.sensitiveFieldsAccessed).toContain('User.salary');
      expect(result.sensitiveFieldsAccessed).toContain('User.permissions');
    });

    test('should calculate appropriate security level', () => {
      const restrictedQuery = parse(`
        query RestrictedQuery {
          auditLog {
            action
            details
          }
          systemSettings {
            key
            value
          }
        }
      `);

      const result = validator.validateQueryAuthorization(restrictedQuery, employeeContext);

      expect(result.securityLevel).toBe('critical'); // Accessing restricted fields without permission
    });

    test('should handle sensitivity level violations', () => {
      const query = parse(`
        query SensitivityViolation {
          users {
            personalData {
              medicalInfo {
                bloodType
                allergies
              }
            }
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      const medicalInfoAccess = result.fieldResults.find(f =>
        f.fieldPath.includes('medicalInfo')
      );

      expect(medicalInfoAccess?.sensitivityViolation).toBeTruthy();
    });
  });

  describe('Permission and Role Validation', () => {
    test('should identify missing permissions', () => {
      const query = parse(`
        query MissingPermissions {
          employees {
            disciplinaryActions {
              type
              description
            }
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      expect(result.requiredPermissions).toContain('disciplinary:read');
      expect(result.fieldResults.some(f => f.missingPermissions.length > 0)).toBe(true);
    });

    test('should identify missing roles', () => {
      const query = parse(`
        query MissingRoles {
          systemSettings {
            key
            value
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, managerContext);

      const systemSettingsAccess = result.fieldResults.find(f =>
        f.fieldPath.includes('SystemSettings')
      );

      expect(systemSettingsAccess?.missingRoles).toContain('Admin');
    });

    test('should provide meaningful access reasons', () => {
      const query = parse(`
        query AccessReasons {
          users {
            salary
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      const salaryAccess = result.fieldResults.find(f =>
        f.fieldPath.includes('salary')
      );

      expect(salaryAccess?.reason).toBeTruthy();
      expect(salaryAccess?.reason).toMatch(/(denied|permission|role)/i);
    });
  });

  describe('Configuration Options', () => {
    test('should respect strict mode configuration', () => {
      const strictValidator = new FieldAuthorizationValidator({
        strictMode: true,
        allowPartialQueries: false
      }, testSchema);

      const query = parse(`
        query StrictMode {
          users {
            id
            name
            salary
          }
        }
      `);

      const result = strictValidator.validateQueryAuthorization(query, employeeContext);

      expect(result.isAuthorized).toBe(false);
    });

    test('should allow partial queries when configured', () => {
      const partialValidator = new FieldAuthorizationValidator({
        allowPartialQueries: true
      }, testSchema);

      const query = parse(`
        query PartialQuery {
          users {
            id
            name
            salary
          }
        }
      `);

      const result = partialValidator.validateQueryAuthorization(query, employeeContext);

      // Should allow query even if some fields are denied
      expect(result.isAuthorized).toBe(result.deniedFields.length < result.fieldResults.length);
    });

    test('should handle custom permission resolver', () => {
      const customValidator = new FieldAuthorizationValidator({
        customPermissionResolver: (field, context) => {
          if (field.includes('budget')) {
            return ['budget:read', 'financial:access'];
          }
          return [];
        }
      }, testSchema);

      const query = parse(`
        query CustomResolver {
          departments {
            budget
          }
        }
      `);

      const result = customValidator.validateQueryAuthorization(query, employeeContext);

      const budgetAccess = result.fieldResults.find(f => f.fieldPath.includes('budget'));
      expect(budgetAccess?.missingPermissions).toContain('financial:access');
    });
  });

  describe('Security Recommendations', () => {
    test('should provide security recommendations', () => {
      const query = parse(`
        query NeedsRecommendations {
          users {
            salary
            permissions {
              name
            }
          }
          auditLog {
            action
          }
          systemSettings {
            key
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r =>
        r.toLowerCase().includes('permission')
      )).toBe(true);
    });

    test('should identify common missing permissions', () => {
      const query = parse(`
        query CommonPermissions {
          employees {
            performanceScore
            disciplinaryActions {
              type
            }
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      expect(result.recommendations.some(r =>
        r.includes('common permissions')
      )).toBe(true);
    });

    test('should warn about excessive sensitive field access', () => {
      const query = parse(`
        query TooManySensitiveFields {
          users {
            salary
            personalData {
              ssn
              medicalInfo {
                bloodType
              }
            }
            permissions {
              name
            }
          }
          auditLog {
            action
          }
          systemSettings {
            key
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, adminContext);

      expect(result.recommendations.some(r =>
        r.toLowerCase().includes('sensitive field')
      )).toBe(true);
    });
  });

  describe('Custom Rules Management', () => {
    test('should allow adding custom permission rules', () => {
      const customRule: FieldPermissionRule = {
        fieldPath: 'Employee.customField',
        requiredPermissions: ['custom:read'],
        requiredRoles: ['CustomRole'],
        sensitivityLevel: 'confidential'
      };

      validator.addPermissionRule(customRule);

      const rules = validator.getPermissionRules();
      const addedRule = rules.find(r => r.fieldPath === 'Employee.customField');

      expect(addedRule).toBeDefined();
      expect(addedRule?.requiredPermissions).toContain('custom:read');
    });

    test('should allow removing permission rules', () => {
      validator.removePermissionRule('User.salary');

      // Query should now allow salary access (no rule to restrict it)
      const query = parse(`
        query RemovedRule {
          users {
            salary
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      const salaryAccess = result.fieldResults.find(f => f.fieldPath.includes('salary'));
      expect(salaryAccess?.isAllowed).toBe(true);
    });
  });

  describe('PostGraphile Integration', () => {
    test('should create PostGraphile-optimized validator', () => {
      const pgValidator = createPostGraphileAuthorizationValidator({
        severityThreshold: 'medium'
      }, testSchema);

      const config = pgValidator.getConfig();

      expect(config.allowPartialQueries).toBe(true);
      expect(config.strictMode).toBe(false);
      expect(config.enableSensitivityAnalysis).toBe(true);
    });

    test('should work with PostGraphile RLS patterns', () => {
      const pgValidator = createPostGraphileAuthorizationValidator({}, testSchema);

      const query = parse(`
        query PostGraphileQuery {
          employees {
            id
            user {
              name
            }
          }
        }
      `);

      const result = pgValidator.validateQueryAuthorization(query, managerContext);

      // PostGraphile validator should be more permissive since RLS handles row-level security
      expect(result.isAuthorized).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle queries without schema', () => {
      const noSchemaValidator = new FieldAuthorizationValidator();

      const query = parse(`
        query NoSchema {
          users {
            id
          }
        }
      `);

      const result = noSchemaValidator.validateQueryAuthorization(query, adminContext);

      expect(result.fieldResults.length).toBeGreaterThan(0);
      expect(result.isAuthorized).toBeDefined();
    });

    test('should handle empty queries', () => {
      const emptyQuery = parse(`
        query Empty {
          __typename
        }
      `);

      const result = validator.validateQueryAuthorization(emptyQuery, employeeContext);

      expect(result.isAuthorized).toBe(true);
      expect(result.deniedFields.length).toBe(0);
    });

    test('should handle invalid field paths gracefully', () => {
      const invalidRule: FieldPermissionRule = {
        fieldPath: '',
        requiredPermissions: [],
        requiredRoles: [],
        sensitivityLevel: 'public'
      };

      validator.addPermissionRule(invalidRule);

      // Should not throw error
      expect(() => {
        validator.getPermissionRules();
      }).not.toThrow();
    });

    test('should handle missing context properties', () => {
      const incompleteContext: AuthorizationContext = {
        userId: 'incomplete',
        userRoles: [],
        userPermissions: [],
        isAdmin: false
        // Missing optional properties
      };

      const query = parse(`
        query IncompleteContext {
          users {
            name
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, incompleteContext);

      expect(result).toBeDefined();
      expect(result.isAuthorized).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    test('should allow configuration updates', () => {
      validator.updateConfig({
        strictMode: true,
        defaultSensitivityLevel: 'confidential'
      });

      const config = validator.getConfig();

      expect(config.strictMode).toBe(true);
      expect(config.defaultSensitivityLevel).toBe('confidential');
    });

    test('should apply updated configuration to validation', () => {
      validator.updateConfig({
        defaultSensitivityLevel: 'restricted'
      });

      const query = parse(`
        query UpdatedConfig {
          users {
            id
            unknownField
          }
        }
      `);

      const result = validator.validateQueryAuthorization(query, employeeContext);

      // Unknown fields should now default to 'restricted' sensitivity
      const unknownFieldAccess = result.fieldResults.find(f =>
        f.fieldPath.includes('unknownField')
      );

      if (unknownFieldAccess) {
        expect(unknownFieldAccess.isAllowed).toBe(false);
      }
    });
  });
});