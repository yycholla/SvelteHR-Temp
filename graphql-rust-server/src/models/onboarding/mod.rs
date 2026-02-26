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
    AssignmentWithModule, AssignmentWithUser, CreateAssignmentInput, Entity as AssignmentEntity,
    Model as Assignment, UpdateAssignmentInput,
};
pub use content_block::{
    ContentBlockGraphQL, CreateContentBlockInput, Entity as ContentBlockEntity,
    Model as ContentBlock, OnboardingContentType, UpdateContentBlockInput,
};
pub use document_upload::{
    CreateDocumentUploadInput, Entity as DocumentUploadEntity, Model as DocumentUpload,
    UpdateDocumentUploadInput,
};
pub use form::{
    CreateOnboardingFormInput, Entity as OnboardingFormEntity, Model as OnboardingForm,
    OnboardingFormGraphQL, UpdateOnboardingFormInput,
};
pub use form_block::{
    CreateFormBlockInput, Entity as FormBlockEntity, FormBlockGraphQL, Model as FormBlock,
    OnboardingFormBlockType, UpdateFormBlockInput,
};
pub use form_progress::{
    CompleteFormInput, Entity as FormProgressEntity, FormProgressGraphQL, Model as FormProgress,
    OnboardingFormProgressStatus, SaveFormProgressInput,
};
pub use form_submission::{
    CreateFormSubmissionInput, Entity as FormSubmissionEntity, Model as FormSubmission,
};
pub use form_template::{
    CreateFormTemplateInput, Entity as FormTemplateEntity, Model as FormTemplate,
    UpdateFormTemplateInput,
};
pub use onboarding_module::{
    CreateOnboardingModuleInput, Entity as OnboardingModuleEntity, Model as OnboardingModule,
    UpdateOnboardingModuleInput,
};
pub use progress::{
    Entity as ProgressEntity, Model as Progress, OnboardingProgressStatus, ProgressGraphQL,
    UpdateProgressInput,
};
