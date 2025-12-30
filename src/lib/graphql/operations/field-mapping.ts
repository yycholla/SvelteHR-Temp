import { gql } from '@urql/svelte';

export const GET_FIELD_MAPPINGS = gql`
	query GetFieldMappings($entityType: String) {
		field_mapping {
			get_field_mappings(entity_type: $entityType) {
				mappings {
					id
					entityType
					localField
					quickbooksField
					direction
					transformation
					isActive
					createdAt
					updatedAt
				}
				total
			}
		}
	}
`;

export const GET_AVAILABLE_FIELDS = gql`
	query GetAvailableFields($entityType: String!) {
		field_mapping {
			get_available_fields(entity_type: $entityType) {
				localFields {
					fieldName
					fieldType
					description
					isRequired
				}
				quickbooksFields {
					fieldName
					fieldType
					description
					isRequired
				}
			}
		}
	}
`;

export const CREATE_FIELD_MAPPING = gql`
	mutation CreateFieldMapping($input: CreateFieldMappingInput!) {
		field_mapping {
			create_field_mapping(input: $input) {
				success
				message
				mappingId
			}
		}
	}
`;

export const UPDATE_FIELD_MAPPING = gql`
	mutation UpdateFieldMapping($input: UpdateFieldMappingInput!) {
		field_mapping {
			update_field_mapping(input: $input) {
				success
				message
				mappingId
			}
		}
	}
`;

export const DELETE_FIELD_MAPPING = gql`
	mutation DeleteFieldMapping($mappingId: String!) {
		field_mapping {
			delete_field_mapping(mapping_id: $mappingId) {
				success
				message
				mappingId
			}
		}
	}
`;
