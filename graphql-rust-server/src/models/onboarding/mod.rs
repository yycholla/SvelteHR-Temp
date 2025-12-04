pub mod assignment;
pub mod content_block;
pub mod document_upload;
pub mod form;
pub mod form_block;
pub mod form_progress;
pub mod form_submission;
pub mod form_template;
pub mod onboarding_module;
pub mod progress;

pub use assignment::{
    Entity as AssignmentEntity, Model as Assignment, CreateAssignmentInput,
    UpdateAssignmentInput, AssignmentWithModule, AssignmentWithUser,
};
pub use content_block::{
    Entity as ContentBlockEntity, Model as ContentBlock, ContentBlockGraphQL,
    CreateContentBlockInput, OnboardingContentType, UpdateContentBlockInput,
};
pub use document_upload::{
    Entity as DocumentUploadEntity, Model as DocumentUpload, CreateDocumentUploadInput,
    UpdateDocumentUploadInput,
};
pub use form_submission::{
    Entity as FormSubmissionEntity, Model as FormSubmission, CreateFormSubmissionInput,
};
pub use form_template::{
    Entity as FormTemplateEntity, Model as FormTemplate, CreateFormTemplateInput,
    UpdateFormTemplateInput,
};
pub use onboarding_module::{
    Entity as OnboardingModuleEntity, Model as OnboardingModule,
    CreateOnboardingModuleInput, UpdateOnboardingModuleInput,
};
pub use progress::{
    Entity as ProgressEntity, Model as Progress, OnboardingProgressStatus, ProgressGraphQL,
    UpdateProgressInput,
};
pub use form::{
    Entity as OnboardingFormEntity, Model as OnboardingForm, OnboardingFormGraphQL,
    CreateOnboardingFormInput, UpdateOnboardingFormInput,
};
pub use form_block::{
    Entity as FormBlockEntity, Model as FormBlock, FormBlockGraphQL,
    OnboardingFormBlockType, CreateFormBlockInput, UpdateFormBlockInput,
};
pub use form_progress::{
    Entity as FormProgressEntity, Model as FormProgress, FormProgressGraphQL,
    OnboardingFormProgressStatus, SaveFormProgressInput, CompleteFormInput,
};
