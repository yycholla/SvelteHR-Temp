use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::domain::sync::{QuickBooksId, SyncError};

/// Data for creating/updating an employee in QuickBooks
#[derive(Debug, Clone)]
pub struct EmployeeData {
    pub given_name: String,
    pub family_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<String>,
    pub sync_token: Option<String>,
}

/// Data for creating/updating a department in QuickBooks
#[derive(Debug, Clone)]
pub struct DepartmentData {
    pub name: String,
    pub parent_id: Option<String>,
    pub sync_token: Option<String>,
}

/// Employee data returned from QuickBooks
#[derive(Debug, Clone)]
pub struct RemoteEmployee {
    pub id: QuickBooksId,
    pub given_name: String,
    pub family_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<String>,
    pub sync_token: String,
    pub last_modified: DateTime<Utc>,
    pub active: bool,
}

/// Department data returned from QuickBooks
#[derive(Debug, Clone)]
pub struct RemoteDepartment {
    pub id: QuickBooksId,
    pub name: String,
    pub parent_id: Option<String>,
    pub sync_token: String,
    pub last_modified: DateTime<Utc>,
    pub active: bool,
}

/// Port for QuickBooks API operations
/// Adapters implement this trait to provide actual API access
#[async_trait]
pub trait QuickBooksPort: Send + Sync {
    /// List employees, optionally filtered by last modified time
    async fn list_employees(
        &self,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<RemoteEmployee>, SyncError>;

    /// Get a single employee by QuickBooks ID
    async fn get_employee(&self, id: &QuickBooksId) -> Result<RemoteEmployee, SyncError>;

    /// Create a new employee in QuickBooks
    async fn create_employee(&self, data: EmployeeData) -> Result<RemoteEmployee, SyncError>;

    /// Update an existing employee in QuickBooks
    async fn update_employee(
        &self,
        id: &QuickBooksId,
        data: EmployeeData,
    ) -> Result<RemoteEmployee, SyncError>;

    /// List departments, optionally filtered by last modified time
    async fn list_departments(
        &self,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<RemoteDepartment>, SyncError>;

    /// Get a single department by QuickBooks ID
    async fn get_department(&self, id: &QuickBooksId) -> Result<RemoteDepartment, SyncError>;

    /// Create or update a department in QuickBooks (best effort)
    async fn upsert_department(&self, data: DepartmentData) -> Result<RemoteDepartment, SyncError>;
}

/// Mock implementation for testing
#[cfg(test)]
pub mod mock {
    use super::*;
    use crate::domain::sync::EntityType;
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    pub struct MockQuickBooksPort {
        pub employees: Arc<Mutex<Vec<RemoteEmployee>>>,
        pub departments: Arc<Mutex<Vec<RemoteDepartment>>>,
        pub should_fail: Arc<Mutex<bool>>,
    }

    impl MockQuickBooksPort {
        pub fn new() -> Self {
            Self::default()
        }

        pub fn with_employees(employees: Vec<RemoteEmployee>) -> Self {
            Self {
                employees: Arc::new(Mutex::new(employees)),
                ..Default::default()
            }
        }

        pub fn set_should_fail(&self, fail: bool) {
            *self.should_fail.lock().unwrap() = fail;
        }
    }

    #[async_trait]
    impl QuickBooksPort for MockQuickBooksPort {
        async fn list_employees(
            &self,
            since: Option<DateTime<Utc>>,
        ) -> Result<Vec<RemoteEmployee>, SyncError> {
            if *self.should_fail.lock().unwrap() {
                return Err(SyncError::quickbooks_api("500", "Mock error", true));
            }

            let employees = self.employees.lock().unwrap();
            let filtered: Vec<RemoteEmployee> = match since {
                Some(ts) => employees
                    .iter()
                    .filter(|e| e.last_modified > ts)
                    .cloned()
                    .collect(),
                None => employees.clone(),
            };
            Ok(filtered)
        }

        async fn get_employee(&self, id: &QuickBooksId) -> Result<RemoteEmployee, SyncError> {
            let employees = self.employees.lock().unwrap();
            employees
                .iter()
                .find(|e| e.id == *id)
                .cloned()
                .ok_or_else(|| SyncError::EntityNotFound {
                    entity_type: EntityType::Employee,
                    id: id.as_str().to_string(),
                })
        }

        async fn create_employee(&self, data: EmployeeData) -> Result<RemoteEmployee, SyncError> {
            let employee = RemoteEmployee {
                id: QuickBooksId::new(format!("qb-{}", uuid::Uuid::new_v4())),
                given_name: data.given_name,
                family_name: data.family_name,
                email: data.email,
                phone: data.phone,
                department_id: data.department_id,
                sync_token: "1".to_string(),
                last_modified: Utc::now(),
                active: true,
            };
            self.employees.lock().unwrap().push(employee.clone());
            Ok(employee)
        }

        async fn update_employee(
            &self,
            id: &QuickBooksId,
            data: EmployeeData,
        ) -> Result<RemoteEmployee, SyncError> {
            let mut employees = self.employees.lock().unwrap();
            let emp = employees
                .iter_mut()
                .find(|e| e.id == *id)
                .ok_or_else(|| SyncError::EntityNotFound {
                    entity_type: EntityType::Employee,
                    id: id.as_str().to_string(),
                })?;

            emp.given_name = data.given_name;
            emp.family_name = data.family_name;
            emp.email = data.email;
            emp.phone = data.phone;
            emp.last_modified = Utc::now();

            Ok(emp.clone())
        }

        async fn list_departments(
            &self,
            _since: Option<DateTime<Utc>>,
        ) -> Result<Vec<RemoteDepartment>, SyncError> {
            Ok(self.departments.lock().unwrap().clone())
        }

        async fn get_department(&self, id: &QuickBooksId) -> Result<RemoteDepartment, SyncError> {
            self.departments
                .lock()
                .unwrap()
                .iter()
                .find(|d| d.id == *id)
                .cloned()
                .ok_or_else(|| SyncError::EntityNotFound {
                    entity_type: EntityType::Department,
                    id: id.as_str().to_string(),
                })
        }

        async fn upsert_department(
            &self,
            data: DepartmentData,
        ) -> Result<RemoteDepartment, SyncError> {
            let dept = RemoteDepartment {
                id: QuickBooksId::new(format!("qb-dept-{}", uuid::Uuid::new_v4())),
                name: data.name,
                parent_id: data.parent_id,
                sync_token: "1".to_string(),
                last_modified: Utc::now(),
                active: true,
            };
            self.departments.lock().unwrap().push(dept.clone());
            Ok(dept)
        }
    }
}
