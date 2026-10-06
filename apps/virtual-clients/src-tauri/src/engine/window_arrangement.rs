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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Rect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
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

#[cfg(target_os = "windows")]
pub fn arrange(request: WindowLayoutRequest) -> io::Result<WindowArrangementResult> {
    use std::process::Command;
    validate_request(&request)?;
    let request_json = serde_json::to_string(&request)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidInput, error.to_string()))?;
    const SCRIPT: &str = r#"
param([string]$RequestJson)
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VirtualClientsWindowNative {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int Width, int Height, bool Repaint);
}
"@
$request = $RequestJson | ConvertFrom-Json
$screens = @([System.Windows.Forms.Screen]::AllScreens)
if ($request.displayIndex -lt 0 -or $request.displayIndex -ge $screens.Count) { throw "Selected display is unavailable." }
$area = $screens[$request.displayIndex].WorkingArea
$targets = @(
  @{ id = 'Native'; patterns = @('Minecraft Education') },
  @{ id = 'Virtual-01'; patterns = @('Virtual-01') },
  @{ id = 'Virtual-02'; patterns = @('Virtual-02') },
  @{ id = 'Virtual-03'; patterns = @('Virtual-03') }
)
$deadline = [DateTime]::UtcNow.AddSeconds(5)
$found = @{}
do {
  foreach ($process in Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle }) {
    foreach ($target in $targets) {
      if ($found.ContainsKey($target.id)) { continue }
      foreach ($pattern in $target.patterns) {
        if ($process.MainWindowTitle -like "*$pattern*") { $found[$target.id] = $process; break }
      }
    }
  }
  if ($found.Count -ge 4) { break }
  Start-Sleep -Milliseconds 200
} while ([DateTime]::UtcNow -lt $deadline)

$ordered = @()
$missing = @()
foreach ($target in $targets) {
  if ($found.ContainsKey($target.id)) { $ordered += [PSCustomObject]@{ id=$target.id; process=$found[$target.id] } }
  else { $missing += $target.id }
}
if ($request.layout -eq 'FOCUS' -and $request.mainWindow) {
  $ordered = @($ordered | Sort-Object @{ Expression = { if ($_.id -eq $request.mainWindow) { 0 } else { 1 } } })
}
$count = $ordered.Count
function Move-Client($item, $x, $y, $w, $h) {
  [VirtualClientsWindowNative]::MoveWindow($item.process.MainWindowHandle, $x, $y, $w, $h, $true) | Out-Null
}
if ($count -gt 0) {
  if ($request.layout -eq 'COLUMNS') {
    $width = [Math]::Floor($area.Width / $count)
    for ($i=0; $i -lt $count; $i++) {
      $x = $area.Left + ($i * $width)
      $w = if ($i -eq $count - 1) { $area.Right - $x } else { $width }
      Move-Client $ordered[$i] $x $area.Top $w $area.Height
    }
  } elseif ($request.layout -eq 'FOCUS' -and $count -gt 1) {
    $mainWidth = [Math]::Floor($area.Width * 0.68)
    $sideWidth = $area.Width - $mainWidth
    Move-Client $ordered[0] $area.Left $area.Top $mainWidth $area.Height
    $sideCount = $count - 1
    $sideHeight = [Math]::Floor($area.Height / $sideCount)
    for ($i=1; $i -lt $count; $i++) {
      $y = $area.Top + (($i - 1) * $sideHeight)
      $h = if ($i -eq $count - 1) { $area.Bottom - $y } else { $sideHeight }
      Move-Client $ordered[$i] ($area.Left + $mainWidth) $y $sideWidth $h
    }
  } elseif ($count -eq 1) {
    Move-Client $ordered[0] $area.Left $area.Top $area.Width $area.Height
  } elseif ($count -eq 2) {
    $width = [Math]::Floor($area.Width / 2)
    Move-Client $ordered[0] $area.Left $area.Top $width $area.Height
    Move-Client $ordered[1] ($area.Left + $width) $area.Top ($area.Width - $width) $area.Height
  } elseif ($count -eq 3) {
    $topWidth = [Math]::Floor($area.Width / 2)
    $topHeight = [Math]::Floor($area.Height / 2)
    Move-Client $ordered[0] $area.Left $area.Top $topWidth $topHeight
    Move-Client $ordered[1] ($area.Left + $topWidth) $area.Top ($area.Width - $topWidth) $topHeight
    Move-Client $ordered[2] $area.Left ($area.Top + $topHeight) $area.Width ($area.Height - $topHeight)
  } else {
    $cellWidth = [Math]::Floor($area.Width / 2)
    $cellHeight = [Math]::Floor($area.Height / 2)
    for ($i=0; $i -lt $count; $i++) {
      $column = $i % 2
      $row = [Math]::Floor($i / 2)
      $x = $area.Left + ($column * $cellWidth)
      $y = $area.Top + ($row * $cellHeight)
      $w = if ($column -eq 1) { $area.Right - $x } else { $cellWidth }
      $h = if ($row -eq 1) { $area.Bottom - $y } else { $cellHeight }
      Move-Client $ordered[$i] $x $y $w $h
    }
  }
}
[PSCustomObject]@{
  schema=2
  layout=$request.layout
  displayIndex=$request.displayIndex
  arranged=@($ordered | ForEach-Object { $_.id })
  missing=@($missing)
} | ConvertTo-Json -Compress
"#;
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", SCRIPT, "-RequestJson", &request_json])
        .output()?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(io::Error::new(io::ErrorKind::Other, format!("window arrangement failed: {detail}")));
    }
    serde_json::from_slice(&output.stdout).map_err(|error| io::Error::new(
        io::ErrorKind::InvalidData,
        format!("window arrangement returned invalid data: {error}")
    ))
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
