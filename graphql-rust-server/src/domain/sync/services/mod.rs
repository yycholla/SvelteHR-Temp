// Domain services - pure business logic, no I/O

pub mod conflict_resolver;
// pub mod change_detector; // TODO: Implement in Task 1.6

pub use conflict_resolver::ConflictResolver;
// pub use change_detector::ChangeDetector; // TODO: Implement in Task 1.6
