mod query;
mod mutation;

pub use query::QueryRoot;
pub use mutation::MutationRoot;

/// Page info for cursor-based pagination
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, async_graphql::SimpleObject)]
pub struct PageInfo {
    pub has_next_page: bool,
    pub has_previous_page: bool,
    pub start_cursor: Option<String>,
    pub end_cursor: Option<String>,
}
