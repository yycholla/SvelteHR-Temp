/**
 * Validation Error GraphQL Operations
 */

import { gql } from '@urql/core';

export const GET_VALIDATION_ERRORS = gql`
	query GetValidationErrors($entityType: String, $includeResolved: Boolean) {
		validation {
			validationFailures(entityType: $entityType, includeResolved: $includeResolved) {
				id
				ruleId
				entityType
				entityId
				fieldName
				invalidValue
				errorMessage
				severity
				detectedAt
				resolvedAt
				resolution
			}
		}
	}
`;

export const IMPORT_EMPLOYEE_WITH_EMAIL = gql`
	mutation ImportEmployeeWithEmail($quickbooksId: String!, $email: String!) {
		employeeImport {
			importEmployeeWithEmail(quickbooksId: $quickbooksId, email: $email) {
				success
				message
				employeeId
				employeeName
			}
		}
	}
`;

export const RESOLVE_VALIDATION_ERROR = gql`
	mutation ResolveValidationError($errorId: String!, $resolution: String!) {
		resolveValidationError(errorId: $errorId, resolution: $resolution) {
			success
			message
		}
	}
`;
