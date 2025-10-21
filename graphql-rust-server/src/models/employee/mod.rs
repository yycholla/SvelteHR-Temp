//! Employee Management Domain
//!
//! Contains employee-related models: skills, certifications, vehicles,
//! emergency contacts, goals, and addresses.

pub mod employee_skill;
pub mod employee_certification;
pub mod employee_vehicle;
pub mod emergency_contact;
pub mod employee_goal;
pub mod user_address;

// Re-exports for convenient access
pub use employee_skill::{
    CreateEmployeeSkillInput, Model as EmployeeSkill, EmployeeSkillFilter, ProficiencyLevel,
    UpdateEmployeeSkillInput,
};
pub use employee_certification::{
    CreateEmployeeCertificationInput, Model as EmployeeCertification, EmployeeCertificationFilter,
};
pub use employee_vehicle::{
    CreateEmployeeVehicleInput, Model as EmployeeVehicle, UpdateEmployeeVehicleInput,
};
pub use emergency_contact::{
    CreateEmergencyContactInput, Model as EmergencyContact, UpdateEmergencyContactInput,
};
pub use employee_goal::{
    CreateEmployeeGoalInput, Model as EmployeeGoal, GoalStatus, UpdateEmployeeGoalInput,
};
pub use user_address::{
    CreateUserAddressInput, Model as UserAddress, UpdateUserAddressInput,
};
