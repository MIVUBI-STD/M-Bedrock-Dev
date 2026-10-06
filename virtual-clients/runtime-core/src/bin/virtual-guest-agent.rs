#![forbid(unsafe_code)]

use m_bedrock_virtual_clients_core::{
    guest_agent_minecraft_profile, GuestStatus, GUEST_AGENT_PORT,
    GUEST_AGENT_PROTOCOL_VERSION, GUEST_STATUS_SCHEMA,
};
#[cfg(target_os = "windows")]
use sha2::{Digest, Sha256};
use std::{
    io::{self, Read, Write},
    net::{TcpListener, TcpStream},
    time::Duration,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let token = guest_agent_token()?;
    let listener = TcpListener::bind(("0.0.0.0", GUEST_AGENT_PORT))?;

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let _ = handle(stream, &token);
            }
            Err(error) => eprintln!("guest agent accept error: {error}"),
        }
    }

    Ok(())
}

fn handle(mut stream: TcpStream, token: &str) -> Result<(), Box<dyn std::error::Error>> {
    let timeout = Some(Duration::from_secs(2));
    stream.set_read_timeout(timeout)?;
    stream.set_write_timeout(timeout)?;

    let mut request = [0_u8; 4096];
    let size = stream.read(&mut request)?;
    let request = String::from_utf8_lossy(&request[..size]);
    let first_line = request.lines().next().unwrap_or_default();

    let supplied = request.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        name.eq_ignore_ascii_case("X-Virtual-Clients-Token")
            .then(|| value.trim())
    });

    if !supplied.is_some_and(|candidate| timing_safe_token_eq(candidate, token)) {
        stream.write_all(
            b"HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        )?;
        return Ok(());
    }

    match first_line {
        "GET /status HTTP/1.1" => {
            let status = GuestStatus {
                schema: GUEST_STATUS_SCHEMA,
                protocol_version: GUEST_AGENT_PROTOCOL_VERSION,
                agent_version: env!("CARGO_PKG_VERSION").to_string(),
                minecraft: guest_agent_minecraft_profile(),
                minecraft_running: Some(minecraft_process_running()),
                machine_identity: guest_machine_identity(),
            };
            write_json(&mut stream, &status)
        }
        "POST /minecraft/launch HTTP/1.1" => {
            let result = launch_minecraft()?;
            write_json(&mut stream, &result)
        }
        _ => {
            stream.write_all(
                b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
            )?;
            Ok(())
        }
    }
}


fn write_json(stream: &mut TcpStream, value: &impl serde::Serialize) -> Result<(), Box<dyn std::error::Error>> {
    let body = serde_json::to_string(value)?;
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    stream.write_all(response.as_bytes())?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn minecraft_process_running() -> bool {
    std::process::Command::new("powershell.exe")
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
fn launch_minecraft() -> Result<m_bedrock_virtual_clients_core::MinecraftLaunchResult, Box<dyn std::error::Error>> {
    use m_bedrock_virtual_clients_core::{MinecraftLaunchResult, MinecraftLaunchState};
    if minecraft_process_running() {
        return Ok(MinecraftLaunchResult { schema: 1, state: MinecraftLaunchState::AlreadyRunning });
    }

    let profile = guest_agent_minecraft_profile().ok_or_else(|| {
        io::Error::new(io::ErrorKind::NotFound, "Minecraft Education installation is unavailable")
    })?;

    let command = match profile.install_type {
        m_bedrock_virtual_clients_core::MinecraftInstallType::Store => {
            "Start-Process 'shell:AppsFolder\\Microsoft.MinecraftEducationEdition_8wekyb3d8bbwe!Microsoft.MinecraftEducationEdition'"
        }
        _ => {
            "$app = Get-StartApps | Where-Object { $_.Name -like '*Minecraft Education*' } | Select-Object -First 1; if (-not $app) { throw 'Minecraft Education Start menu entry is unavailable' }; Start-Process ('shell:AppsFolder\\' + $app.AppID)"
        }
    };
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command])
        .output()?;
    if !output.status.success() {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("Minecraft Education launch failed: {}", String::from_utf8_lossy(&output.stderr).trim()),
        ).into());
    }

    let deadline = std::time::Instant::now() + Duration::from_secs(30);
    while std::time::Instant::now() < deadline {
        if minecraft_process_running() {
            return Ok(MinecraftLaunchResult { schema: 1, state: MinecraftLaunchState::Launched });
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    Err(io::Error::new(io::ErrorKind::TimedOut, "Minecraft Education did not start within 30 seconds").into())
}

#[cfg(not(target_os = "windows"))]
fn launch_minecraft() -> Result<m_bedrock_virtual_clients_core::MinecraftLaunchResult, Box<dyn std::error::Error>> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "Minecraft launch currently targets Windows guests").into())
}

#[cfg(target_os = "windows")]
fn guest_machine_identity() -> Option<String> {
    let output = std::process::Command::new("powershell.exe")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid -ErrorAction Stop).MachineGuid",
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let machine_guid = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if machine_guid.is_empty() || machine_guid.len() > 128 {
        return None;
    }

    Some(format!("{:x}", Sha256::digest(machine_guid.as_bytes())))
}

#[cfg(not(target_os = "windows"))]
fn guest_machine_identity() -> Option<String> {
    None
}

fn timing_safe_token_eq(candidate: &str, expected: &str) -> bool {
    if candidate.len() != expected.len() {
        return false;
    }

    candidate
        .as_bytes()
        .iter()
        .zip(expected.as_bytes())
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

#[cfg(target_os = "windows")]
fn guest_agent_token() -> io::Result<String> {
    let program_files = std::env::var_os("ProgramFiles")
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "ProgramFiles is unavailable"))?;
    let vmtoolsd = std::path::PathBuf::from(program_files)
        .join("VMware")
        .join("VMware Tools")
        .join("vmtoolsd.exe");
    if !vmtoolsd.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!(
                "VMware Tools vmtoolsd.exe is missing: {}",
                vmtoolsd.display()
            ),
        ));
    }

    let output = std::process::Command::new(vmtoolsd)
        .args(["--cmd", "info-get guestinfo.virtualclients.token"])
        .output()?;
    if !output.status.success() {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "Guest Agent token is not available from VMware guestinfo",
        ));
    }

    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if token.len() != 64 || !token.chars().all(|character| character.is_ascii_hexdigit()) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Guest Agent token has an invalid format",
        ));
    }
    Ok(token)
}

#[cfg(not(target_os = "windows"))]
fn guest_agent_token() -> io::Result<String> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Virtual Guest Agent currently targets Windows guests",
    ))
}

#[cfg(test)]
mod tests {
    use super::timing_safe_token_eq;

    #[test]
    fn guest_token_comparison_requires_exact_match() {
        let token = "a".repeat(64);
        assert!(timing_safe_token_eq(&token, &token));
        assert!(!timing_safe_token_eq(&"b".repeat(64), &token));
        assert!(!timing_safe_token_eq("short", &token));
    }
}
