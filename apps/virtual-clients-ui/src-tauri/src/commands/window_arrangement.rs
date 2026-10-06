use crate::engine::window_arrangement::{self, WindowArrangementResult};

#[tauri::command]
pub async fn window_arrange() -> Result<WindowArrangementResult, String> {
    tauri::async_runtime::spawn_blocking(window_arrangement::arrange)
        .await
        .map_err(|error| format!("Window arrangement task failed: {error}"))?
        .map_err(|error| error.to_string())
}
