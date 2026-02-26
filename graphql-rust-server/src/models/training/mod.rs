pub mod assignment;
pub mod content;
pub mod progress;
pub mod training;

pub use assignment::{
    CreateAssignmentInput, Model as TrainingAssignment, TrainingAssignmentWithUser,
};
pub use content::{
    ContentType, CreateTrainingContentInput, Model as TrainingContent, UpdateTrainingContentInput,
};
pub use progress::{Model as TrainingProgress, ProgressStatus, UpdateProgressInput};
pub use training::{CreateTrainingInput, Model as Training, UpdateTrainingInput};
