use std::{io, process::Command, time::{Duration, Instant}};

#[cfg(target_os = "windows")]
fn minecraft_running() -> bool {
    Command::new("powershell.exe")
        .args([
            "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
            "@(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like '*Minecraft*' -or $_.ProcessName -like '*Education*' }).Count -gt 0",
        ])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .is_some_and(|output| String::from_utf8_lossy(&output.stdout).trim().eq_ignore_ascii_case("True"))
}

#[cfg(target_os = "windows")]
pub fn launch_native_minecraft() -> io::Result<()> {
    if minecraft_running() { return Ok(()); }
    let script = "$app = Get-StartApps | Where-Object { $_.Name -like '*Minecraft Education*' } | Select-Object -First 1; if (-not $app) { throw 'Minecraft Education Start menu entry is unavailable' }; Start-Process ('shell:AppsFolder\\' + $app.AppID)";
    let output = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script])
        .output()?;
    if !output.status.success() {
        return Err(io::Error::new(io::ErrorKind::Other, format!(
            "Native Minecraft Education launch failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
    let deadline = Instant::now() + Duration::from_secs(30);
    while Instant::now() < deadline {
        if minecraft_running() { return Ok(()); }
        std::thread::sleep(Duration::from_millis(500));
    }
    Err(io::Error::new(io::ErrorKind::TimedOut, "Native Minecraft Education did not start within 30 seconds"))
}

#[cfg(not(target_os = "windows"))]
pub fn launch_native_minecraft() -> io::Result<()> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "Native Minecraft launch currently targets Windows"))
}
