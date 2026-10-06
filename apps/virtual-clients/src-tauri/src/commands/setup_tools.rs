use crate::engine::setup_tools;

#[tauri::command]
pub async fn setup_open_base_location() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(setup_tools::open_base_location)
        .await
        .map_err(|error| format!("Open Base location task failed: {error}"))?
        .map_err(|error| error.to_string())
}
