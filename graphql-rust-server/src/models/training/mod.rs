pub mod training;
pub mod content;
pub mod assignment;
pub mod progress;

pub use training::{Model as Training, CreateTrainingInput, UpdateTrainingInput};
pub use content::{Model as TrainingContent, CreateTrainingContentInput, UpdateTrainingContentInput, ContentType};
pub use assignment::{Model as TrainingAssignment, CreateAssignmentInput, TrainingAssignmentWithUser};
pub use progress::{Model as TrainingProgress, UpdateProgressInput, ProgressStatus};
