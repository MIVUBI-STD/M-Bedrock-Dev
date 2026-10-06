use crate::engine::{
    screen_overlay::{self, OverlayPosition, ScreenOverlayItem},
    window_arrangement::{self, DisplayInfo, WindowArrangementResult, WindowLayoutRequest},
};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPreference {
    pub enabled: bool,
    pub show_screen_number: bool,
    pub show_label: bool,
    pub position: OverlayPosition,
    pub opacity: f32,
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyWindowLayoutRequest {
    pub layout: WindowLayoutRequest,
    pub overlay: OverlayPreference,
    #[serde(default)]
    pub identify: bool,
}

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

#[tauri::command]
pub async fn window_apply_layout(request: ApplyWindowLayoutRequest) -> Result<WindowArrangementResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let execution = window_arrangement::arrange_with_slots(request.layout)?;
        let items = execution.slots.iter().enumerate().map(|(index, slot)| ScreenOverlayItem {
            screen_number: index + 1,
            label: request.overlay.labels.get(&slot.id).cloned().unwrap_or_else(|| slot.id.clone()),
            x: slot.rect.x,
            y: slot.rect.y,
            width: slot.rect.width,
            height: slot.rect.height,
        }).collect();
        let mut result = execution.result;
        match screen_overlay::apply(screen_overlay::ScreenOverlayRequest {
            enabled: request.overlay.enabled,
            show_screen_number: request.overlay.show_screen_number,
            show_label: request.overlay.show_label,
            position: request.overlay.position,
            opacity: request.overlay.opacity,
            identify: request.identify,
            items,
        }) {
            Ok(()) => result.overlay_applied = Some(request.overlay.enabled),
            Err(error) => {
                result.overlay_applied = Some(false);
                result.overlay_warning = Some(error.to_string());
            }
        }
        Ok::<_, std::io::Error>(result)
    })
    .await
    .map_err(|error| format!("Window Layout task failed: {error}"))?
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn window_clear_overlay() -> Result<(), String> {
    screen_overlay::clear();
    Ok(())
}
