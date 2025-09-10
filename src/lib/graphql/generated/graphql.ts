/**
 * Generated GraphQL Types - Stub File
 * 
 * This is a temporary stub file to prevent import errors during development.
 * In a production environment, this would be generated from the GraphQL schema.
 */

// Basic GraphQL types
export interface Query {
  [key: string]: any;
}

export interface Mutation {
  [key: string]: any;
}

// Employee types
export interface Employee {
  id: string;
  username?: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name?: string;
  profile_picture_url?: string;
  roles?: Role[];
  employee?: any;
  role_id?: string;
  department_id?: string;
  job_title?: string;
  hire_date?: string;
  employment_type?: string;
  status?: string;
  salary?: string;
  phone?: string;
}

export interface EmployeePage {
  nodes: Employee[];
  pageInfo: PageInfo;
  totalCount: number;
}

// Auth types
export interface AuthPayload {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  errors?: any[];
  expiresAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  profile_picture_url?: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  level: number;
  display_name?: string;
}

// Common types
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// Input types
export interface CreateEmployeeInput {
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId?: string;
  departmentId?: string;
  jobTitle?: string;
  hireDate?: string;
  employmentType?: string;
  status?: string;
}

export interface UpdateEmployeeInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: string;
  departmentId?: string;
  jobTitle?: string;
  hireDate?: string;
  employmentType?: string;
  status?: string;
}

// Enum types
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED'
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN'
}

export enum EmployeeSortField {
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
  NAME = 'NAME',
  EMAIL = 'EMAIL',
  HIRE_DATE = 'HIRE_DATE'
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

// Variable types for mutations/queries
export interface LoginMutationVariables {
  email: string;
  password: string;
}

export interface RefreshTokenMutationVariables {
  refreshToken: string;
}

export interface RequestPasswordResetMutationVariables {
  email: string;
}

export interface ResetPasswordMutationVariables {
  token: string;
  newPassword: string;
}

// Query response types
export interface GetCurrentUserQuery {
  me?: {
    user?: User;
    permissions?: string[];
  };
}

export interface VerifyTokenQuery {
  verifyToken?: {
    valid: boolean;
    user?: User;
    permissions?: string[];
  };
}

export interface LoginMutation {
  login?: AuthPayload;
}

// Stub - more types would be added as needed
export type GetEmployeesQuery = Query;
export type GetEmployeeByIdQuery = Query;
export type CreateEmployeeMutation = Mutation;
export type UpdateEmployeeMutation = Mutation;
export type DeleteEmployeeMutation = Mutation;