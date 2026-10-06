use crate::engine::window_arrangement::{self, DisplayInfo, WindowArrangementResult, WindowLayoutRequest};

#[tauri::command]
pub async fn window_displays() -> Result<Vec<DisplayInfo>, String> {
    tauri::async_runtime::spawn_blocking(window_arrangement::displays)
        .await
        .map_err(|error| format!("Display discovery task failed: {error}"))?
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn window_arrange(request: WindowLayoutRequest) -> Result<WindowArrangementResult, String> {
    tauri::async_runtime::spawn_blocking(move || window_arrangement::arrange(request))
        .await
        .map_err(|error| format!("Window arrangement task failed: {error}"))?
        .map_err(|error| error.to_string())
}
