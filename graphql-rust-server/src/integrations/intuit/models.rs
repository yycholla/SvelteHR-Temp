use serde::{Deserialize, Serialize};

// Re-export types from quickbooks_types crate
pub use quickbooks_types::{
    Employee,
    common::{
        Email,
        PhoneNumber,
        NtRef,
        MetaData,
    },
};

// Type aliases for compatibility with existing code
pub type EmailAddress = Email;
pub type IntuitEmployee = Employee;

// Since we're using the quickbooks_types Employee directly,
// we no longer need separate request types - just use Employee

// Custom wrapper types for QuickBooks API responses
// These are not entity types, so we need to define them ourselves

/// QuickBooks API response wrapper for single entity operations
#[derive(Debug, Deserialize)]
pub struct QuickBooksResponse<T> {
    #[serde(rename = "Employee")]
    pub employee: Option<T>,

    #[serde(rename = "QueryResponse")]
    pub query_response: Option<QueryResponse<T>>,

    #[serde(rename = "Fault")]
    pub fault: Option<ApiFault>,
}

/// QueryResponse for list operations
#[derive(Debug, Deserialize)]
pub struct QueryResponse<T> {
    #[serde(rename = "Employee")]
    pub employees: Option<Vec<T>>,

    #[serde(rename = "maxResults")]
    pub max_results: Option<i32>,

    #[serde(rename = "startPosition")]
    pub start_position: Option<i32>,
}

/// API fault/error response
#[derive(Debug, Deserialize)]
pub struct ApiFault {
    #[serde(rename = "Error")]
    pub errors: Vec<ApiError>,

    #[serde(rename = "type")]
    pub fault_type: String,
}

impl std::fmt::Display for ApiFault {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let Some(first_error) = self.errors.first() {
            write!(f, "{}", first_error)
        } else {
            write!(f, "Unknown QuickBooks error")
        }
    }
}

/// Individual API error
#[derive(Debug, Deserialize)]
pub struct ApiError {
    #[serde(rename = "Message")]
    pub message: String,

    #[serde(rename = "Detail")]
    pub detail: String,

    #[serde(rename = "code")]
    pub code: String,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} ({})", self.message, self.detail)
    }
}

/// Company information from QuickBooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyInfo {
    #[serde(rename = "CompanyName")]
    pub company_name: Option<String>,

    #[serde(rename = "LegalName")]
    pub legal_name: Option<String>,

    #[serde(rename = "CompanyAddr")]
    pub address: Option<Address>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    #[serde(rename = "Line1")]
    pub line1: Option<String>,

    #[serde(rename = "City")]
    pub city: Option<String>,

    #[serde(rename = "CountrySubDivisionCode")]
    pub state: Option<String>,

    #[serde(rename = "PostalCode")]
    pub postal_code: Option<String>,
}

/// Response wrapper for company info
#[derive(Debug, Deserialize)]
pub struct CompanyInfoResponse {
    #[serde(rename = "CompanyInfo")]
    pub company_info: Option<CompanyInfo>,

    #[serde(rename = "Fault")]
    pub fault: Option<ApiFault>,
}

/// Batch operation request
#[derive(Debug, Serialize)]
pub struct BatchRequest {
    #[serde(rename = "BatchItemRequest")]
    pub batch_item_requests: Vec<BatchItemRequest>,
}

/// Single item in a batch request
#[derive(Debug, Serialize)]
pub struct BatchItemRequest {
    #[serde(rename = "bId")]
    pub batch_id: String,

    #[serde(flatten)]
    pub operation: BatchOperation,
}

/// Type of batch operation
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum BatchOperation {
    Create {
        #[serde(rename = "Employee")]
        employee: EmployeeExtended,
    },
    Update {
        #[serde(rename = "Employee")]
        employee: EmployeeExtended,
    },
    Query {
        #[serde(rename = "Query")]
        query: String,
    },
}

/// Batch operation response
#[derive(Debug, Deserialize)]
pub struct BatchResponse {
    #[serde(rename = "BatchItemResponse")]
    pub batch_item_responses: Vec<BatchItemResponse>,

    #[serde(rename = "time")]
    pub time: Option<String>,
}

/// Single item in a batch response
#[derive(Debug, Deserialize)]
pub struct BatchItemResponse {
    #[serde(rename = "bId")]
    pub batch_id: String,

    #[serde(rename = "Employee")]
    pub employee: Option<Employee>,

    #[serde(rename = "QueryResponse")]
    pub query_response: Option<QueryResponse<Employee>>,

    #[serde(rename = "Fault")]
    pub fault: Option<ApiFault>,
}

/// Extended Employee struct with additional QuickBooks fields not in the base crate
///
/// Note: The quickbooks-types crate (v0.1.1) is missing some fields that QuickBooks
/// supports, such as DepartmentRef and ParentRef (for manager/supervisor).
/// This struct allows us to serialize these fields when creating/updating employees.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EmployeeExtended {
    #[serde(flatten)]
    pub base: Employee,

    /// Reference to the department this employee belongs to
    #[serde(skip_serializing_if = "Option::is_none")]
    pub department_ref: Option<NtRef>,

    /// Reference to the parent employee (manager/supervisor)
    /// Note: QuickBooks uses "ParentRef" for the manager relationship
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_ref: Option<NtRef>,
}

impl From<Employee> for EmployeeExtended {
    fn from(base: Employee) -> Self {
        Self {
            base,
            department_ref: None,
            parent_ref: None,
        }
    }
}

// Helper functions for creating employees

/// Create a minimal employee for QuickBooks (only required fields)
pub fn create_minimal_employee(
    given_name: String,
    family_name: String,
) -> Employee {
    Employee {
        given_name: Some(given_name),
        family_name: Some(family_name),
        ..Default::default()
    }
}

/// Create an employee with email
pub fn create_employee_with_email(
    given_name: String,
    family_name: String,
    email: String,
) -> Employee {
    Employee {
        given_name: Some(given_name),
        family_name: Some(family_name),
        primary_email_addr: Some(EmailAddress {
            address: Some(email),
        }),
        ..Default::default()
    }
}
