// Domain services - pure business logic, no I/O

pub mod change_detector;
pub mod conflict_resolver;

pub use change_detector::ChangeDetector;
pub use conflict_resolver::ConflictResolver;
