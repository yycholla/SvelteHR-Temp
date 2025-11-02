pub mod auth;
pub mod department;
pub mod employee;
pub mod rbac;
pub mod task;
pub mod time;
pub mod user;

pub use auth::AuthMutations;
pub use department::DepartmentMutations;
pub use employee::EmployeeMutations;
pub use rbac::RbacMutations;
pub use task::TaskMutations;
pub use time::TimeMutations;
pub use user::UserMutations;