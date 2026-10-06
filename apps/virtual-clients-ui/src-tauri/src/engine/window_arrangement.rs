use serde::{Deserialize, Serialize};
use std::io;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowArrangementResult {
    pub schema: u32,
    pub layout: String,
    pub arranged: Vec<String>,
    pub missing: Vec<String>,
}

#[cfg(target_os = "windows")]
pub fn arrange() -> io::Result<WindowArrangementResult> {
    use std::process::Command;
    const SCRIPT: &str = r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VirtualClientsWindowNative {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int Width, int Height, bool Repaint);
}
"@
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
$count = $ordered.Count
$layout = if ($count -le 1) { 'SINGLE' } elseif ($count -eq 2) { 'SIDE_BY_SIDE' } else { 'GRID_2X2' }
if ($count -gt 0) {
  $area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
  $columns = if ($count -eq 1) { 1 } elseif ($count -eq 2) { 2 } else { 2 }
  $rows = if ($count -le 2) { 1 } else { 2 }
  $cellWidth = [Math]::Floor($area.Width / $columns)
  $cellHeight = [Math]::Floor($area.Height / $rows)
  for ($index=0; $index -lt $count; $index++) {
    $column = $index % $columns
    $row = [Math]::Floor($index / $columns)
    [VirtualClientsWindowNative]::MoveWindow(
      $ordered[$index].process.MainWindowHandle,
      $area.Left + ($column * $cellWidth),
      $area.Top + ($row * $cellHeight),
      $cellWidth, $cellHeight, $true
    ) | Out-Null
  }
}
[PSCustomObject]@{ schema=1; layout=$layout; arranged=@($ordered | ForEach-Object { $_.id }); missing=@($missing) } | ConvertTo-Json -Compress
"#;
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", SCRIPT])
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
pub fn arrange() -> io::Result<WindowArrangementResult> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "window arrangement is currently available on Windows only"))
}
