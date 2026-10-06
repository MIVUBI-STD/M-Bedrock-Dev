use serde::{Deserialize, Serialize};
use std::io;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OverlayPosition {
    TopLeft,
    TopRight,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenOverlayItem {
    pub screen_number: usize,
    pub label: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenOverlayRequest {
    pub enabled: bool,
    pub show_screen_number: bool,
    pub show_label: bool,
    pub position: OverlayPosition,
    pub opacity: f32,
    pub identify: bool,
    pub items: Vec<ScreenOverlayItem>,
}

#[cfg(target_os = "windows")]
mod windows {
    use super::*;
    use std::{
        ffi::c_void,
        ptr::{null, null_mut},
        sync::{Mutex, OnceLock},
    };
    use windows_sys::Win32::{
        Foundation::{COLORREF, HWND, LPARAM, LRESULT, WPARAM},
        Graphics::Gdi::{
            BeginPaint, CreateSolidBrush, DeleteObject, DrawTextW, EndPaint, FillRect, GetStockObject,
            SetBkMode, SetTextColor, DEFAULT_GUI_FONT, DT_LEFT, DT_NOPREFIX, DT_SINGLELINE,
            DT_VCENTER, PAINTSTRUCT, TRANSPARENT,
        },
        System::LibraryLoader::GetModuleHandleW,
        UI::WindowsAndMessaging::{
            CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW,
            LoadCursorW, PostQuitMessage, RegisterClassW, SetLayeredWindowAttributes, ShowWindow,
            TranslateMessage, CS_HREDRAW, CS_VREDRAW, CW_USEDEFAULT, IDC_ARROW, LWA_ALPHA, MSG,
            SW_SHOWNOACTIVATE, WM_DESTROY, WM_PAINT, WNDCLASSW, WS_EX_LAYERED, WS_EX_NOACTIVATE,
            WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_EX_TRANSPARENT, WS_POPUP,
        },
    };

    struct OverlayWindow {
        hwnd: HWND,
        text: Box<Vec<u16>>,
    }

    unsafe impl Send for OverlayWindow {}

    static WINDOWS: OnceLock<Mutex<Vec<OverlayWindow>>> = OnceLock::new();
    static CLASS_REGISTERED: OnceLock<()> = OnceLock::new();

    fn overlays() -> &'static Mutex<Vec<OverlayWindow>> {
        WINDOWS.get_or_init(|| Mutex::new(Vec::new()))
    }

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    unsafe extern "system" fn window_proc(hwnd: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        match message {
            WM_PAINT => {
                let mut paint = std::mem::zeroed::<PAINTSTRUCT>();
                let dc = BeginPaint(hwnd, &mut paint);
                let rect = paint.rcPaint;
                let brush = CreateSolidBrush(0x00201B18 as COLORREF);
                FillRect(dc, &rect, brush);
                DeleteObject(brush);
                SetBkMode(dc, TRANSPARENT as i32);
                SetTextColor(dc, 0x00F5F5F5 as COLORREF);
                let font = GetStockObject(DEFAULT_GUI_FONT);
                windows_sys::Win32::Graphics::Gdi::SelectObject(dc, font);
                if let Ok(windows) = overlays().lock() {
                    if let Some(window) = windows.iter().find(|item| item.hwnd == hwnd) {
                        let mut text_rect = rect;
                        text_rect.left += 12;
                        DrawTextW(
                            dc,
                            window.text.as_ptr(),
                            -1,
                            &mut text_rect,
                            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX,
                        );
                    }
                }
                EndPaint(hwnd, &paint);
                0
            }
            WM_DESTROY => {
                PostQuitMessage(0);
                0
            }
            _ => DefWindowProcW(hwnd, message, wparam, lparam),
        }
    }

    unsafe fn ensure_class() -> io::Result<Vec<u16>> {
        let class_name = wide("MIVUBI_VIRTUAL_CLIENTS_SCREEN_OVERLAY");
        CLASS_REGISTERED.get_or_try_init(|| {
            let instance = GetModuleHandleW(null());
            let class = WNDCLASSW {
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(window_proc),
                hInstance: instance,
                hCursor: LoadCursorW(null_mut(), IDC_ARROW),
                lpszClassName: class_name.as_ptr(),
                ..std::mem::zeroed()
            };
            if RegisterClassW(&class) == 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(())
        })?;
        Ok(class_name)
    }

    pub fn clear() {
        if let Ok(mut windows) = overlays().lock() {
            for window in windows.drain(..) {
                unsafe { DestroyWindow(window.hwnd); }
            }
        }
    }

    pub fn apply(request: ScreenOverlayRequest) -> io::Result<()> {
        clear();
        if !request.enabled { return Ok(()); }
        let opacity = request.opacity.clamp(0.35, 1.0);
        let alpha = (opacity * 255.0).round() as u8;

        unsafe {
            let class_name = ensure_class()?;
            let instance = GetModuleHandleW(null());
            let mut created = Vec::new();

            for item in request.items {
                let mut parts = Vec::new();
                if request.show_screen_number { parts.push(format!("SCREEN {}", item.screen_number)); }
                if request.show_label && !item.label.trim().is_empty() { parts.push(item.label.trim().to_string()); }
                if parts.is_empty() { continue; }
                let text = Box::new(wide(&parts.join("  ·  ")));
                let overlay_width = if request.identify { item.width.min(360) } else { item.width.min(260) };
                let overlay_height = if request.identify { 64 } else { 38 };
                let x = match request.position {
                    OverlayPosition::TopLeft => item.x + 12,
                    OverlayPosition::TopRight => item.x + item.width - overlay_width - 12,
                };
                let y = item.y + 12;
                let hwnd = CreateWindowExW(
                    WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST,
                    class_name.as_ptr(), wide("").as_ptr(), WS_POPUP,
                    x, y, overlay_width, overlay_height,
                    null_mut(), null_mut(), instance, null_mut::<c_void>(),
                );
                if hwnd.is_null() {
                    for window in created.drain(..) { DestroyWindow(window.hwnd); }
                    return Err(io::Error::last_os_error());
                }
                SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA);
                created.push(OverlayWindow { hwnd, text });
            }

            {
                let mut windows = overlays().lock().map_err(|_| io::Error::new(io::ErrorKind::Other, "overlay state lock failed"))?;
                windows.extend(created);
                for window in windows.iter() { ShowWindow(window.hwnd, SW_SHOWNOACTIVATE); }
            }
        }
        Ok(())
    }

    pub fn run_message_loop() {
        unsafe {
            let mut message = std::mem::zeroed::<MSG>();
            while GetMessageW(&mut message, null_mut(), 0, 0) > 0 {
                TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub use windows::{apply, clear, run_message_loop};

#[cfg(not(target_os = "windows"))]
pub fn apply(_request: ScreenOverlayRequest) -> io::Result<()> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "Screen Overlay is currently available on Windows only"))
}
#[cfg(not(target_os = "windows"))]
pub fn clear() {}
#[cfg(not(target_os = "windows"))]
pub fn run_message_loop() {}
