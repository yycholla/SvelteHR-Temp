// Value Objects
export { DocumentTitle } from './value-objects/DocumentTitle';
export { DocumentType } from './value-objects/DocumentType';
export { FileSize } from './value-objects/FileSize';
export { MimeType } from './value-objects/MimeType';
export { UploadedBy } from './value-objects/UploadedBy';
export { DocumentStatus } from './value-objects/DocumentStatus';
export type { DocumentStatusValue } from './value-objects/DocumentStatus';
export type { DocumentTypeValue } from './value-objects/DocumentType';

// Entities
export { Document } from './entities/Document';
export type { DocumentProps } from './entities/Document';

// Errors
export {
	DocumentError,
	DocumentTitleValidationError,
	DocumentTypeValidationError,
	FileSizeValidationError,
	MimeTypeValidationError,
	UploadedByValidationError,
	DocumentStatusValidationError,
	DocumentValidationError,
	DocumentNotFoundError,
	DocumentStatusTransitionError
} from './errors/DocumentErrors';
