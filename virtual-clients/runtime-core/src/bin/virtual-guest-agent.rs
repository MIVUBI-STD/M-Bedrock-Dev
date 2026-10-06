#![forbid(unsafe_code)]

use m_bedrock_virtual_clients_core::{
    guest_agent_minecraft_profile, GuestStatus, GUEST_AGENT_PORT,
    GUEST_AGENT_PROTOCOL_VERSION, GUEST_STATUS_SCHEMA,
};

#[cfg(target_os = "windows")]
use sha2::{Digest, Sha256};
use std::{
    io::{self, Read, Write},
    net::{Shutdown, TcpListener, TcpStream},
    time::Duration,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args().any(|argument| argument == "--register-interactive-launcher") {
        return register_interactive_launcher();
    }
    if std::env::args().any(|argument| argument == "--interactive-launcher") {
        return run_interactive_launcher();
    }
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

const INTERACTIVE_LAUNCHER_PORT: u16 = 47832;
const INTERACTIVE_LAUNCH_TIMEOUT: Duration = Duration::from_secs(35);

fn interactive_launcher_address() -> String {
    format!("127.0.0.1:{INTERACTIVE_LAUNCHER_PORT}")
}

#[cfg(target_os = "windows")]
fn interactive_launcher_ready() -> bool {
    let Ok(address) = interactive_launcher_address().parse() else { return false; };
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(150)) else { return false; };
    let request_id = "0000000000000000";
    if stream.set_read_timeout(Some(Duration::from_millis(250))).is_err()
        || stream.set_write_timeout(Some(Duration::from_millis(150))).is_err()
        || stream.write_all(format!("PING {request_id}\n").as_bytes()).is_err()
        || stream.shutdown(Shutdown::Write).is_err()
    {
        return false;
    }
    let mut response = String::new();
    stream.read_to_string(&mut response).is_ok() && response.trim() == format!("READY:{request_id}")
}

#[cfg(target_os = "windows")]
fn request_interactive_minecraft_launch() -> Result<m_bedrock_virtual_clients_core::MinecraftLaunchResult, Box<dyn std::error::Error>> {
    use m_bedrock_virtual_clients_core::{MinecraftLaunchResult, MinecraftLaunchState};
    if minecraft_process_running() {
        return Ok(MinecraftLaunchResult { schema: 1, state: MinecraftLaunchState::AlreadyRunning });
    }

    let address = interactive_launcher_address().parse()?;
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(1))
        .map_err(|_| io::Error::new(io::ErrorKind::NotConnected, "Interactive launcher is not active for the signed-in Windows user"))?;
    stream.set_read_timeout(Some(INTERACTIVE_LAUNCH_TIMEOUT))?;
    stream.set_write_timeout(Some(Duration::from_secs(2)))?;

    let request_id = format!("{:016x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_nanos());
    stream.write_all(format!("MINECRAFT_EDUCATION {request_id}\n").as_bytes())?;
    stream.shutdown(Shutdown::Write)?;
    let mut response = String::new();
    stream.read_to_string(&mut response)?;

    if response.trim() == format!("OK:{request_id}") {
        return Ok(MinecraftLaunchResult { schema: 1, state: MinecraftLaunchState::Launched });
    }
    if response.starts_with(&format!("ERROR:{request_id}:")) {
        return Err(io::Error::new(io::ErrorKind::Other, response.trim().to_string()).into());
    }
    Err(io::Error::new(io::ErrorKind::InvalidData, "Interactive launcher returned an invalid response").into())
}

#[cfg(target_os = "windows")]
fn register_interactive_launcher() -> Result<(), Box<dyn std::error::Error>> {
    let app_data = std::env::var_os("APPDATA")
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "APPDATA is unavailable for the interactive Windows user"))?;
    let startup = std::path::PathBuf::from(app_data)
        .join("Microsoft").join("Windows").join("Start Menu").join("Programs").join("Startup");
    std::fs::create_dir_all(&startup)?;
    let executable = std::env::current_exe()?;
    let launcher = startup.join("M-Bedrock Virtual Interactive Launcher.cmd");
    let command = format!("@echo off\r\nstart \"\" /min \"{}\" --interactive-launcher\r\n", executable.display());
    std::fs::write(&launcher, command)?;
    if !interactive_launcher_ready() {
        std::process::Command::new(&executable)
            .arg("--interactive-launcher")
            .spawn()?;
    }
    println!("{}", launcher.display());
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn register_interactive_launcher() -> Result<(), Box<dyn std::error::Error>> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "Interactive launcher registration currently targets Windows guests").into())
}

#[cfg(target_os = "windows")]
fn run_interactive_launcher() -> Result<(), Box<dyn std::error::Error>> {
    if !interactive_session_available() {
        return Err(io::Error::new(io::ErrorKind::PermissionDenied, "Interactive launcher must run in an interactive Windows user session").into());
    }
    let listener = TcpListener::bind(("127.0.0.1", INTERACTIVE_LAUNCHER_PORT))?;
    for incoming in listener.incoming() {
        let Ok(mut stream) = incoming else { continue; };
        stream.set_read_timeout(Some(Duration::from_secs(2)))?;
        stream.set_write_timeout(Some(INTERACTIVE_LAUNCH_TIMEOUT))?;
        let mut request = String::new();
        stream.read_to_string(&mut request)?;
        if request.trim().is_empty() { continue; }
        let mut parts = request.split_whitespace();
        let verb = parts.next().unwrap_or_default();
        let request_id = parts.next().unwrap_or_default();
        let request_id_valid = request_id.len() == 16
            && request_id.chars().all(|character| character.is_ascii_hexdigit())
            && parts.next().is_none();
        let response = if verb == "PING" && request_id_valid {
            format!("READY:{request_id}\n")
        } else if verb == "MINECRAFT_EDUCATION" && request_id_valid {
            match launch_minecraft_interactive() {
                Ok(()) => format!("OK:{request_id}\n"),
                Err(error) => format!("ERROR:{request_id}:{error}\n"),
            }
        } else {
            "ERROR:INVALID:unsupported interactive action\n".to_string()
        };
        stream.write_all(response.as_bytes())?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn run_interactive_launcher() -> Result<(), Box<dyn std::error::Error>> {
    Err(io::Error::new(io::ErrorKind::Unsupported, "Interactive launcher currently targets Windows guests").into())
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
                interactive_launcher_ready: Some(interactive_launcher_ready()),
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
fn interactive_session_available() -> bool {
    let output = std::process::Command::new("powershell.exe")
        .args([
            "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
            "$session = (Get-Process -Id $PID).SessionId; $interactive = @(Get-Process explorer -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $session }).Count -gt 0; ($session -ne 0) -and $interactive",
        ])
        .output();
    output.ok()
        .filter(|output| output.status.success())
        .is_some_and(|output| String::from_utf8_lossy(&output.stdout).trim().eq_ignore_ascii_case("True"))
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
    request_interactive_minecraft_launch()
}

#[cfg(target_os = "windows")]
fn launch_minecraft_interactive() -> Result<(), Box<dyn std::error::Error>> {
    if !interactive_session_available() {
        return Err(io::Error::new(io::ErrorKind::PermissionDenied, "Interactive launcher is not running in an interactive Windows user session").into());
    }
    if minecraft_process_running() { return Ok(()); }

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
            return Ok(());
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
