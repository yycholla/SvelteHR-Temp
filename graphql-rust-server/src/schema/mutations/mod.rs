pub mod auth;
pub mod department;
pub mod employee;
pub mod employee_import;
pub mod rbac;
pub mod rollback;
pub mod task;
pub mod time;
pub mod user;

pub use auth::AuthMutations;
pub use department::DepartmentMutations;
pub use employee::EmployeeMutations;
pub use employee_import::EmployeeImportMutations;
pub use rbac::RbacMutations;
pub use rollback::{RollbackMutations, RollbackQueries};
pub use task::TaskMutations;
pub use time::TimeMutations;
pub use user::UserMutations;