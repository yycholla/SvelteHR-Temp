use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::Json,
    Extension,
};
use sea_orm::{ActiveModelTrait, Set};
use serde::Serialize;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::{auth::UserContext, handlers::AppState, models::media_asset};

#[derive(Serialize)]
pub struct UploadResponse {
    pub id: Uuid,
    pub url: String,
    pub filename: String,
}

pub async fn upload_handler(
    Extension(user_context): Extension<UserContext>,
    State(app_state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    let user_id = user_context.user_id;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        let filename = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();

        // Skip non-file fields if they don't have a filename (basic check)
        if field.file_name().is_none() {
            continue;
        }

        let data = field
            .bytes()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let size_bytes = data.len() as i64;

        // Ensure uploads directory exists
        if !Path::new("uploads").exists() {
            tokio::fs::create_dir("uploads")
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        // Generate unique filename
        let id = Uuid::new_v4();
        let unique_filename = format!("{}_{}", id, filename);
        let filepath = format!("uploads/{}", unique_filename);
        // Assuming the frontend/proxy maps /uploads/ to this directory
        let url = format!("/uploads/{}", unique_filename);

        // Save file
        let mut file = File::create(&filepath)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        file.write_all(&data)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Save to DB
        let asset = media_asset::ActiveModel {
            id: Set(id),
            filename: Set(filename.clone()),
            storage_path: Set(filepath),
            mime_type: Set(content_type),
            size_bytes: Set(size_bytes),
            uploaded_by: Set(Some(user_id)),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        };

        asset.insert(&app_state.db).await.map_err(|e| {
            tracing::error!("Failed to save media asset to DB: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        return Ok(Json(UploadResponse { id, url, filename }));
    }

    Err(StatusCode::BAD_REQUEST)
}
