//! Load Testing Configuration
//!
//! Defines configuration for load testing GraphQL API with concurrent users,
//! role distribution, and operation weighting.

use std::time::Duration;
use async_graphql::Variables;
use serde_json::Value;

/// Role distribution for load testing
#[derive(Debug, Clone)]
pub struct RoleDistribution {
    /// Percentage of employees (0.0 - 1.0)
    pub employee: f64,
    /// Percentage of HR managers (0.0 - 1.0)
    pub hr_manager: f64,
    /// Percentage of admins (0.0 - 1.0)
    pub admin: f64,
    /// Percentage of system admins (0.0 - 1.0)
    pub system_admin: f64,
}

impl RoleDistribution {
    /// Create a new role distribution
    ///
    /// # Panics
    /// Panics if percentages don't sum to 1.0 (within 0.01 tolerance)
    pub fn new(employee: f64, hr_manager: f64, admin: f64, system_admin: f64) -> Self {
        let sum = employee + hr_manager + admin + system_admin;
        assert!(
            (sum - 1.0).abs() < 0.01,
            "Role percentages must sum to 1.0, got {}",
            sum
        );

        Self {
            employee,
            hr_manager,
            admin,
            system_admin,
        }
    }

    /// Create a realistic role distribution for production-like testing
    ///
    /// Distribution:
    /// - 70% employees
    /// - 20% HR managers
    /// - 8% admins
    /// - 2% system admins
    pub fn realistic() -> Self {
        Self {
            employee: 0.70,
            hr_manager: 0.20,
            admin: 0.08,
            system_admin: 0.02,
        }
    }

    /// Create an even distribution across all roles (for testing)
    pub fn even() -> Self {
        Self {
            employee: 0.25,
            hr_manager: 0.25,
            admin: 0.25,
            system_admin: 0.25,
        }
    }

    /// Select a random role based on distribution
    pub fn select_role(&self, random: f64) -> &'static str {
        if random < self.employee {
            "hr_employee"
        } else if random < self.employee + self.hr_manager {
            "hr_manager"
        } else if random < self.employee + self.hr_manager + self.admin {
            "admin"
        } else {
            "system_admin"
        }
    }
}

/// A single GraphQL operation for load testing
#[derive(Debug, Clone)]
pub struct LoadTestOperation {
    /// Operation name (for metrics)
    pub name: String,

    /// GraphQL query or mutation string
    pub query: String,

    /// GraphQL variables (optional)
    pub variables: Option<Variables>,

    /// Weight for weighted random selection (0.0 - 1.0)
    /// Higher weight = more likely to be selected
    pub weight: f64,

    /// Whether this is a mutation (vs query)
    pub is_mutation: bool,
}

impl LoadTestOperation {
    /// Create a new load test operation
    pub fn new(name: impl Into<String>, query: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            query: query.into(),
            variables: None,
            weight: 1.0,
            is_mutation: false,
        }
    }

    /// Set GraphQL variables
    pub fn with_variables(mut self, variables: Variables) -> Self {
        self.variables = Some(variables);
        self
    }

    /// Set weight for operation selection
    pub fn with_weight(mut self, weight: f64) -> Self {
        assert!(weight >= 0.0 && weight <= 1.0, "Weight must be between 0 and 1");
        self.weight = weight;
        self
    }

    /// Mark as mutation (vs query)
    pub fn as_mutation(mut self) -> Self {
        self.is_mutation = true;
        self
    }
}

/// Configuration for a load test run
#[derive(Debug, Clone)]
pub struct LoadTestConfig {
    /// Number of concurrent virtual users
    pub concurrent_users: usize,

    /// Duration to run the load test
    pub duration: Duration,

    /// GraphQL endpoint URL
    pub endpoint: String,

    /// Operations to execute during load test
    pub operations: Vec<LoadTestOperation>,

    /// Distribution of roles across virtual users
    pub role_distribution: RoleDistribution,

    /// Think time between requests (simulates user behavior)
    pub think_time: Option<Duration>,

    /// Ramp-up period to gradually increase load
    pub ramp_up: Option<Duration>,
}

impl LoadTestConfig {
    /// Create a new load test configuration
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            concurrent_users: 10,
            duration: Duration::from_secs(30),
            endpoint: endpoint.into(),
            operations: Vec::new(),
            role_distribution: RoleDistribution::realistic(),
            think_time: None,
            ramp_up: None,
        }
    }

    /// Set number of concurrent users
    pub fn with_users(mut self, users: usize) -> Self {
        self.concurrent_users = users;
        self
    }

    /// Set test duration
    pub fn with_duration(mut self, duration: Duration) -> Self {
        self.duration = duration;
        self
    }

    /// Add an operation to the test
    pub fn add_operation(mut self, operation: LoadTestOperation) -> Self {
        self.operations.push(operation);
        self
    }

    /// Set role distribution
    pub fn with_role_distribution(mut self, distribution: RoleDistribution) -> Self {
        self.role_distribution = distribution;
        self
    }

    /// Set think time between requests
    pub fn with_think_time(mut self, think_time: Duration) -> Self {
        self.think_time = Some(think_time);
        self
    }

    /// Set ramp-up period
    pub fn with_ramp_up(mut self, ramp_up: Duration) -> Self {
        self.ramp_up = Some(ramp_up);
        self
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.concurrent_users == 0 {
            return Err("Concurrent users must be greater than 0".into());
        }

        if self.operations.is_empty() {
            return Err("At least one operation must be configured".into());
        }

        let total_weight: f64 = self.operations.iter().map(|op| op.weight).sum();
        if total_weight <= 0.0 {
            return Err("Total operation weight must be greater than 0".into());
        }

        Ok(())
    }

    /// Select a random operation based on weights
    pub fn select_operation(&self, random: f64) -> &LoadTestOperation {
        let total_weight: f64 = self.operations.iter().map(|op| op.weight).sum();
        let normalized_random = random * total_weight;

        let mut cumulative = 0.0;
        for op in &self.operations {
            cumulative += op.weight;
            if normalized_random < cumulative {
                return op;
            }
        }

        // Fallback to last operation
        &self.operations[self.operations.len() - 1]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_distribution_realistic() {
        let dist = RoleDistribution::realistic();
        assert!((dist.employee - 0.70).abs() < 0.01);
        assert!((dist.hr_manager - 0.20).abs() < 0.01);
    }

    #[test]
    fn test_role_distribution_select() {
        let dist = RoleDistribution::realistic();

        // 0.0 - 0.70 should select employee
        assert_eq!(dist.select_role(0.35), "hr_employee");

        // 0.70 - 0.90 should select hr_manager
        assert_eq!(dist.select_role(0.80), "hr_manager");

        // 0.90 - 0.98 should select admin
        assert_eq!(dist.select_role(0.95), "admin");

        // 0.98 - 1.0 should select system_admin
        assert_eq!(dist.select_role(0.99), "system_admin");
    }

    #[test]
    fn test_load_test_config_builder() {
        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .with_users(100)
            .with_duration(Duration::from_secs(60))
            .add_operation(LoadTestOperation::new("test", "{ __typename }").with_weight(0.8))
            .with_role_distribution(RoleDistribution::even());

        assert_eq!(config.concurrent_users, 100);
        assert_eq!(config.duration, Duration::from_secs(60));
        assert_eq!(config.operations.len(), 1);
    }

    #[test]
    fn test_operation_selection_by_weight() {
        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .add_operation(LoadTestOperation::new("op1", "query1").with_weight(0.7))
            .add_operation(LoadTestOperation::new("op2", "query2").with_weight(0.3));

        // Random 0.0 - 0.7 should select op1
        let op = config.select_operation(0.35);
        assert_eq!(op.name, "op1");

        // Random 0.7 - 1.0 should select op2
        let op = config.select_operation(0.85);
        assert_eq!(op.name, "op2");
    }

    #[test]
    fn test_config_validation() {
        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .add_operation(LoadTestOperation::new("test", "query"));

        assert!(config.validate().is_ok());

        // Empty operations should fail
        let config = LoadTestConfig::new("http://localhost:8080/graphql");
        assert!(config.validate().is_err());
    }
}
