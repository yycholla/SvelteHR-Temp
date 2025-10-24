//! Document Management Domain
//!
//! Contains document system models: documents, versions, categories,
//! assignments, access logs, and encrypted storage.

pub mod document;
pub mod document_version;
pub mod document_category;
pub mod document_assignment;
pub mod document_access_log;
pub mod encrypted_file_storage;

// Re-exports for convenient access
pub use document::{CreateDocumentInput, Model as Document, UpdateDocumentInput, UploadDocumentInput};
pub use document_version::{CreateDocumentVersionInput, Model as DocumentVersion};
pub use document_category::{
    CreateDocumentCategoryInput, Model as DocumentCategory, UpdateDocumentCategoryInput,
};
pub use document_assignment::{
    CreateDocumentAssignmentInput, DocumentAccessLevel, Model as DocumentAssignment,
};
pub use document_access_log::{
    CreateDocumentAccessLogInput, Model as DocumentAccessLog, DocumentAccessType,
};
pub use encrypted_file_storage::{CreateEncryptedFileStorageInput, Model as EncryptedFileStorage};
