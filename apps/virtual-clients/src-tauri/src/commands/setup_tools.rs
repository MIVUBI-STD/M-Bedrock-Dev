use crate::engine::setup_tools;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn setup_open_guest_tools(app: AppHandle) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Virtual Clients resource directory is unavailable: {error}"))?;
    let tools = resource_dir.join("guest").join("windows");
    if !tools.is_dir() {
        return Err(format!(
            "Packaged setup tools are missing: {}",
            tools.display()
        ));
    }

    tauri::async_runtime::spawn_blocking(move || setup_tools::open_folder(&tools))
        .await
        .map_err(|error| format!("Open setup tools task failed: {error}"))?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn setup_open_base_location() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(setup_tools::open_base_location)
        .await
        .map_err(|error| format!("Open Base location task failed: {error}"))?
        .map_err(|error| error.to_string())
}
