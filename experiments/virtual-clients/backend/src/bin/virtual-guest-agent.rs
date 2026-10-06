use m_bedrock_virtual_clients_core::{
    guest_agent_minecraft_profile, GuestStatus, GUEST_AGENT_PORT, GUEST_STATUS_SCHEMA,
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

    if first_line != "GET /status HTTP/1.1" {
        stream.write_all(
            b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        )?;
        return Ok(());
    }

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

    let status = GuestStatus {
        schema: GUEST_STATUS_SCHEMA,
        agent_version: env!("CARGO_PKG_VERSION").to_string(),
        minecraft: guest_agent_minecraft_profile(),
        machine_identity: guest_machine_identity(),
    };
    let body = serde_json::to_string(&status)?;
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    stream.write_all(response.as_bytes())?;
    Ok(())
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
