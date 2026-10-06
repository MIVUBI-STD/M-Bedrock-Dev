use serde::{Deserialize, Serialize};
use std::io;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WindowLayout {
    Grid,
    Focus,
    Columns,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowLayoutRequest {
    pub layout: WindowLayout,
    pub display_index: usize,
    pub main_window: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub index: usize,
    pub primary: bool,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowArrangementResult {
    pub schema: u32,
    pub layout: WindowLayout,
    pub display_index: usize,
    pub arranged: Vec<String>,
    pub missing: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overlay_applied: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overlay_warning: Option<String>,
}

fn validate_request(request: &WindowLayoutRequest) -> io::Result<()> {
    if let Some(main) = request.main_window.as_deref() {
        if !matches!(main, "Native" | "Virtual-01" | "Virtual-02" | "Virtual-03") {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "main window is not a known client"));
        }
    }
    if matches!(request.layout, WindowLayout::Focus) && request.main_window.is_none() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Focus layout requires a main window"));
    }
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

fn calculate_slots(layout: &WindowLayout, area: Rect, count: usize) -> Vec<Rect> {
    if count == 0 { return Vec::new(); }
    if count == 1 { return vec![area]; }

    match layout {
        WindowLayout::Columns => {
            let width = area.width / count as i32;
            (0..count).map(|index| {
                let x = area.x + index as i32 * width;
                Rect {
                    x,
                    y: area.y,
                    width: if index + 1 == count { area.x + area.width - x } else { width },
                    height: area.height,
                }
            }).collect()
        }
        WindowLayout::Focus => {
            let main_width = (area.width as f64 * 0.68).floor() as i32;
            let side_width = area.width - main_width;
            let side_count = count - 1;
            let side_height = area.height / side_count as i32;
            let mut slots = vec![Rect { x: area.x, y: area.y, width: main_width, height: area.height }];
            slots.extend((0..side_count).map(|index| {
                let y = area.y + index as i32 * side_height;
                Rect {
                    x: area.x + main_width,
                    y,
                    width: side_width,
                    height: if index + 1 == side_count { area.y + area.height - y } else { side_height },
                }
            }));
            slots
        }
        WindowLayout::Grid if count == 2 => {
            let width = area.width / 2;
            vec![
                Rect { x: area.x, y: area.y, width, height: area.height },
                Rect { x: area.x + width, y: area.y, width: area.width - width, height: area.height },
            ]
        }
        WindowLayout::Grid if count == 3 => {
            let width = area.width / 2;
            let height = area.height / 2;
            vec![
                Rect { x: area.x, y: area.y, width, height },
                Rect { x: area.x + width, y: area.y, width: area.width - width, height },
                Rect { x: area.x, y: area.y + height, width: area.width, height: area.height - height },
            ]
        }
        WindowLayout::Grid => {
            let width = area.width / 2;
            let height = area.height / 2;
            (0..count.min(4)).map(|index| {
                let column = index % 2;
                let row = index / 2;
                let x = area.x + column as i32 * width;
                let y = area.y + row as i32 * height;
                Rect {
                    x,
                    y,
                    width: if column == 1 { area.x + area.width - x } else { width },
                    height: if row == 1 { area.y + area.height - y } else { height },
                }
            }).collect()
        }
    }
}

#[cfg(target_os = "windows")]
pub fn displays() -> io::Result<Vec<DisplayInfo>> {
    use std::process::Command;
    const SCRIPT: &str = r#"
Add-Type -AssemblyName System.Windows.Forms
$index = 0
@([System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
  $area = $_.WorkingArea
  [PSCustomObject]@{
    index = $index
    primary = $_.Primary
    width = $area.Width
    height = $area.Height
  }
  $index++
}) | ConvertTo-Json -Compress
"#;
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", SCRIPT])
        .output()?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(io::Error::new(io::ErrorKind::Other, format!("display discovery failed: {detail}")));
    }
    let value: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, format!("display discovery returned invalid data: {error}")))?;
    let normalized = if value.is_array() { value } else { serde_json::Value::Array(vec![value]) };
    serde_json::from_value(normalized)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, format!("display discovery returned invalid data: {error}")))
}

#[cfg(not(target_os = "windows"))]
pub fn displays() -> io::Result<Vec<DisplayInfo>> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "Window Layout is currently available on Windows only"))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveredWindow {
    id: String,
    handle: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WindowDiscovery {
    area_x: i32,
    area_y: i32,
    area_width: i32,
    area_height: i32,
    windows: Vec<DiscoveredWindow>,
    missing: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ArrangedSlot {
    pub id: String,
    pub rect: Rect,
}

#[derive(Debug)]
pub struct ArrangementExecution {
    pub result: WindowArrangementResult,
    pub slots: Vec<ArrangedSlot>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowMove {
    handle: u64,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[cfg(target_os = "windows")]
fn discover_windows(display_index: usize) -> io::Result<WindowDiscovery> {
    use std::process::Command;
    const SCRIPT: &str = r#"
param([int]$DisplayIndex)
Add-Type -AssemblyName System.Windows.Forms
$screens = @([System.Windows.Forms.Screen]::AllScreens)
if ($DisplayIndex -lt 0 -or $DisplayIndex -ge $screens.Count) { throw "Selected display is unavailable." }
$area = $screens[$DisplayIndex].WorkingArea
$targets = @(
  @{ id = 'Native'; patterns = @('Minecraft Education'); requireMinecraft = $true },
  @{ id = 'Virtual-01'; patterns = @('Virtual-01'); requireMinecraft = $false },
  @{ id = 'Virtual-02'; patterns = @('Virtual-02'); requireMinecraft = $false },
  @{ id = 'Virtual-03'; patterns = @('Virtual-03'); requireMinecraft = $false }
)
$deadline = [DateTime]::UtcNow.AddSeconds(5)
$found = @{}
do {
  foreach ($process in Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle }) {
    foreach ($target in $targets) {
      if ($found.ContainsKey($target.id)) { continue }
      foreach ($pattern in $target.patterns) {
        $titleMatches = $process.MainWindowTitle -like "*$pattern*"
        if (-not $titleMatches) { continue }
        if ($target.requireMinecraft) {
          $name = $process.ProcessName.ToLowerInvariant()
          if ($name -notlike "*minecraft*" -and $name -notlike "*education*") { continue }
        }
        $found[$target.id] = [uint64]$process.MainWindowHandle
        break
      }
    }
  }
  if ($found.Count -ge 4) { break }
  Start-Sleep -Milliseconds 200
} while ([DateTime]::UtcNow -lt $deadline)
$windows = @()
$missing = @()
foreach ($target in $targets) {
  if ($found.ContainsKey($target.id)) {
    $windows += [PSCustomObject]@{ id=$target.id; handle=$found[$target.id] }
  } else {
    $missing += $target.id
  }
}
[PSCustomObject]@{
  areaX=$area.Left; areaY=$area.Top; areaWidth=$area.Width; areaHeight=$area.Height
  windows=$windows; missing=$missing
} | ConvertTo-Json -Depth 4 -Compress
"#;
    let output = Command::new("powershell.exe")
        .args([
            "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", SCRIPT,
            "-DisplayIndex", &display_index.to_string(),
        ])
        .output()?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(io::Error::new(io::ErrorKind::Other, format!("window discovery failed: {detail}")));
    }
    serde_json::from_slice(&output.stdout).map_err(|error| io::Error::new(
        io::ErrorKind::InvalidData,
        format!("window discovery returned invalid data: {error}")
    ))
}

#[cfg(target_os = "windows")]
fn apply_window_moves(moves: &[WindowMove]) -> io::Result<()> {
    use std::process::Command;
    let plan = serde_json::to_string(moves)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidInput, error.to_string()))?;
    const SCRIPT: &str = r#"
param([string]$PlanJson)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VirtualClientsWindowNative {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int Width, int Height, bool Repaint);
}
"@
$moves = @($PlanJson | ConvertFrom-Json)
foreach ($move in $moves) {
  [VirtualClientsWindowNative]::MoveWindow(
    [IntPtr][uint64]$move.handle,
    [int]$move.x, [int]$move.y, [int]$move.width, [int]$move.height, $true
  ) | Out-Null
}
"#;
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", SCRIPT, "-PlanJson", &plan])
        .output()?;
    if output.status.success() {
        Ok(())
    } else {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(io::Error::new(io::ErrorKind::Other, format!("window placement failed: {detail}")))
    }
}

#[cfg(target_os = "windows")]
pub fn arrange_with_slots(request: WindowLayoutRequest) -> io::Result<ArrangementExecution> {
    validate_request(&request)?;
    let mut discovery = discover_windows(request.display_index)?;
    if matches!(request.layout, WindowLayout::Focus) {
        let main = request.main_window.as_deref().expect("validated Focus main window");
        discovery.windows.sort_by_key(|window| if window.id == main { 0 } else { 1 });
    }

    let area = Rect {
        x: discovery.area_x,
        y: discovery.area_y,
        width: discovery.area_width,
        height: discovery.area_height,
    };
    let slots = calculate_slots(&request.layout, area, discovery.windows.len());
    let moves: Vec<WindowMove> = discovery.windows.iter().zip(slots.iter()).map(|(window, slot)| WindowMove {
        handle: window.handle,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
    }).collect();
    apply_window_moves(&moves)?;

    let arranged: Vec<String> = discovery.windows.iter().map(|window| window.id.clone()).collect();
    let arranged_slots = discovery.windows.iter().zip(slots.iter()).map(|(window, rect)| ArrangedSlot {
        id: window.id.clone(),
        rect: *rect,
    }).collect();
    Ok(ArrangementExecution {
        result: WindowArrangementResult {
            schema: 2,
            layout: request.layout,
            display_index: request.display_index,
            arranged,
            missing: discovery.missing,
            overlay_applied: None,
            overlay_warning: None,
        },
        slots: arranged_slots,
    })
}

#[cfg(not(target_os = "windows"))]
pub fn arrange(request: WindowLayoutRequest) -> io::Result<WindowArrangementResult> {
    validate_request(&request)?;
    Err(io::Error::new(io::ErrorKind::Unsupported, "Window Layout is currently available on Windows only"))
}

#[cfg(test)]
mod tests {
    use super::{calculate_slots, validate_request, Rect, WindowLayout, WindowLayoutRequest};

    #[test]
    fn layout_geometry_is_adaptive_and_gap_free() {
        let area = Rect { x: 0, y: 0, width: 1200, height: 800 };
        let grid = calculate_slots(&WindowLayout::Grid, area, 3);
        assert_eq!(grid.len(), 3);
        assert_eq!(grid[2], Rect { x: 0, y: 400, width: 1200, height: 400 });

        let focus = calculate_slots(&WindowLayout::Focus, area, 4);
        assert_eq!(focus.len(), 4);
        assert_eq!(focus[0].height, 800);
        assert_eq!(focus.iter().skip(1).map(|slot| slot.height).sum::<i32>(), 800);

        let columns = calculate_slots(&WindowLayout::Columns, area, 4);
        assert_eq!(columns.len(), 4);
        assert_eq!(columns.iter().map(|slot| slot.width).sum::<i32>(), 1200);
    }

    #[test]
    fn focus_requires_known_main_window() {
        assert!(validate_request(&WindowLayoutRequest {
            layout: WindowLayout::Focus,
            display_index: 0,
            main_window: Some("Native".into()),
        }).is_ok());
        assert!(validate_request(&WindowLayoutRequest {
            layout: WindowLayout::Focus,
            display_index: 0,
            main_window: None,
        }).is_err());
        assert!(validate_request(&WindowLayoutRequest {
            layout: WindowLayout::Grid,
            display_index: 0,
            main_window: Some("Unknown".into()),
        }).is_err());
    }
}
