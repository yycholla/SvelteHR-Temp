//! Contract Test Runner
//!
//! This file serves as the entry point for running all contract tests.
//! Contract tests validate GraphQL schema structure before implementation.
//!
//! Run with: cargo test --test contract_tests

mod contract;

// Include all contract test modules
#[path = "contract/test_employee_contract.rs"]
mod test_employee_contract;

#[path = "contract/test_documents_contract.rs"]
mod test_documents_contract;

#[path = "contract/test_time_contract.rs"]
mod test_time_contract;

#[path = "contract/test_analytics_contract.rs"]
mod test_analytics_contract;

#[path = "contract/test_system_contract.rs"]
mod test_system_contract;

#[path = "contract/test_events_contract.rs"]
mod test_events_contract;

#[path = "contract/test_tasks_contract.rs"]
mod test_tasks_contract;

#[path = "contract/test_reviews_contract.rs"]
mod test_reviews_contract;
