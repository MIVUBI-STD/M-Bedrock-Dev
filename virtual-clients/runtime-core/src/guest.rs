use serde::{Deserialize, Serialize};
use std::{
    io::{self, Read, Write},
    net::{TcpStream, ToSocketAddrs},
    time::Duration,
};

use crate::profile::MinecraftProfile;

pub const GUEST_AGENT_PORT: u16 = 47831;
pub const GUEST_STATUS_SCHEMA: u32 = 3;
pub const GUEST_AGENT_PROTOCOL_VERSION: u32 = 2;
pub const GUEST_AGENT_MIN_STATUS_PROTOCOL: u32 = 1;
pub const MINECRAFT_LAUNCH_SCHEMA: u32 = 1;
const REQUEST_ID_HEADER: &str = "X-Virtual-Clients-Request-Id";
const MAX_GUEST_RESPONSE_BYTES: u64 = 32 * 1024;

pub fn guest_agent_protocol_compatible(protocol_version: u32) -> bool {
    (GUEST_AGENT_MIN_STATUS_PROTOCOL..=GUEST_AGENT_PROTOCOL_VERSION).contains(&protocol_version)
}

pub fn guest_agent_launch_compatible(protocol_version: u32) -> bool {
    protocol_version >= 2 && protocol_version <= GUEST_AGENT_PROTOCOL_VERSION
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuestStatus {
    pub schema: u32,
    pub protocol_version: u32,
    pub agent_version: String,
    pub minecraft: Option<MinecraftProfile>,
    #[serde(default)]
    pub minecraft_running: Option<bool>,
    #[serde(default)]
    pub interactive_launcher_ready: Option<bool>,
    pub machine_identity: Option<String>,
}


#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MinecraftLaunchState {
    AlreadyRunning,
    Launched,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftLaunchResult {
    pub schema: u32,
    pub state: MinecraftLaunchState,
}

fn request_id() -> io::Result<String> {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?
        .as_nanos();
    Ok(format!("{nanos:032x}"))
}

fn response_request_id(headers: &str) -> Option<&str> {
    headers.lines().find_map(|line| {
        let (name, value) = line.split_once(':')?;
        name.eq_ignore_ascii_case(REQUEST_ID_HEADER).then(|| value.trim())
    })
}

pub fn launch_guest_minecraft(ip: &str, token: &str, timeout: Duration) -> io::Result<MinecraftLaunchResult> {
    let address = (ip, GUEST_AGENT_PORT)
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| io::Error::new(io::ErrorKind::AddrNotAvailable, "guest IP is invalid"))?;
    if token.len() != 64 || !token.chars().all(|character| character.is_ascii_hexdigit()) {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "guest agent token is invalid"));
    }
    let mut stream = TcpStream::connect_timeout(&address, timeout)?;
    stream.set_read_timeout(Some(timeout))?;
    stream.set_write_timeout(Some(timeout))?;
    let request_id = request_id()?;
    let request = format!(
        "POST /minecraft/launch HTTP/1.1\r\nHost: virtual-client\r\nX-Virtual-Clients-Token: {token}\r\n{REQUEST_ID_HEADER}: {request_id}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    );
    stream.write_all(request.as_bytes())?;
    let mut response = Vec::new();
    stream.take(MAX_GUEST_RESPONSE_BYTES + 1).read_to_end(&mut response)?;
    if response.len() as u64 > MAX_GUEST_RESPONSE_BYTES {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "guest agent launch response exceeds the configured limit"));
    }
    let response = String::from_utf8(response)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    let (headers, body) = response.split_once("\r\n\r\n")
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "guest agent launch response is malformed"))?;
    let status_line = headers.lines().next().unwrap_or_default();
    if !status_line.contains(" 200 ") {
        return Err(io::Error::new(io::ErrorKind::Other, format!("guest agent launch returned {status_line}")));
    }
    if response_request_id(headers) != Some(request_id.as_str()) {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "guest agent launch response request identity mismatch"));
    }
    let result: MinecraftLaunchResult = serde_json::from_str(body.trim())
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if result.schema != MINECRAFT_LAUNCH_SCHEMA {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "unsupported Minecraft launch response schema"));
    }
    Ok(result)
}

pub fn query_guest_status(ip: &str, token: &str, timeout: Duration) -> io::Result<GuestStatus> {
    let address = (ip, GUEST_AGENT_PORT)
        .to_socket_addrs()?
        .next()
        .ok_or_else(|| io::Error::new(io::ErrorKind::AddrNotAvailable, "guest IP is invalid"))?;

    let mut stream = TcpStream::connect_timeout(&address, timeout)?;
    stream.set_read_timeout(Some(timeout))?;
    stream.set_write_timeout(Some(timeout))?;
    if token.len() != 64 || !token.chars().all(|character| character.is_ascii_hexdigit()) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "guest agent token is invalid",
        ));
    }
    let request_id = request_id()?;
    let request = format!(
        "GET /status HTTP/1.1\r\nHost: virtual-client\r\nX-Virtual-Clients-Token: {token}\r\n{REQUEST_ID_HEADER}: {request_id}\r\nConnection: close\r\n\r\n"
    );
    stream.write_all(request.as_bytes())?;

    let mut response = Vec::new();
    stream.take(MAX_GUEST_RESPONSE_BYTES + 1).read_to_end(&mut response)?;
    if response.len() as u64 > MAX_GUEST_RESPONSE_BYTES {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "guest agent status response exceeds the configured limit"));
    }
    let response = String::from_utf8(response)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;

    let (headers, body) = response.split_once("\r\n\r\n").ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            "guest agent response is malformed",
        )
    })?;

    let status_line = headers.lines().next().unwrap_or_default();
    if !status_line.contains(" 200 ") {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("guest agent returned {status_line}"),
        ));
    }
    if response_request_id(headers) != Some(request_id.as_str()) {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "guest agent status response request identity mismatch"));
    }

    let status: GuestStatus = serde_json::from_str(body.trim())
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;

    validate_guest_status(&status)?;

    Ok(status)
}

fn validate_guest_status(status: &GuestStatus) -> io::Result<()> {
    if status.schema != GUEST_STATUS_SCHEMA {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "unsupported guest status schema {}; expected {}",
                status.schema, GUEST_STATUS_SCHEMA
            ),
        ));
    }

    if status.protocol_version == 0 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "guest agent protocol version must be non-zero",
        ));
    }

    if let Some(identity) = status.machine_identity.as_deref() {
        if identity.len() != 64
            || !identity
                .chars()
                .all(|character| character.is_ascii_hexdigit())
        {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "guest Windows identity fingerprint is invalid",
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        guest_agent_launch_compatible, guest_agent_protocol_compatible, validate_guest_status, GuestStatus,
        MinecraftLaunchResult, MinecraftLaunchState, GUEST_AGENT_PROTOCOL_VERSION, GUEST_STATUS_SCHEMA,
        MINECRAFT_LAUNCH_SCHEMA, MAX_GUEST_RESPONSE_BYTES,
    };
    use crate::profile::{MinecraftInstallType, MinecraftProfile};
    use std::io;

    #[test]
    fn guest_response_limit_is_explicit() {
        assert_eq!(MAX_GUEST_RESPONSE_BYTES, 32 * 1024);
    }

    #[test]
    fn guest_identity_fingerprint_format_is_strict() {
        let mut status = GuestStatus {
            schema: GUEST_STATUS_SCHEMA,
            protocol_version: GUEST_AGENT_PROTOCOL_VERSION,
            agent_version: "0.1.0".into(),
            minecraft: None,
            minecraft_running: Some(false),
            interactive_launcher_ready: Some(false),
            machine_identity: Some("a".repeat(64)),
        };
        validate_guest_status(&status).unwrap();

        status.machine_identity = Some("short".into());
        assert_eq!(
            validate_guest_status(&status).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );

        status.machine_identity = Some("z".repeat(64));
        assert_eq!(
            validate_guest_status(&status).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn guest_protocol_compatibility_is_explicit() {
        assert!(guest_agent_protocol_compatible(1));
        assert!(guest_agent_protocol_compatible(GUEST_AGENT_PROTOCOL_VERSION));
        assert!(!guest_agent_launch_compatible(1));
        assert!(guest_agent_launch_compatible(GUEST_AGENT_PROTOCOL_VERSION));
        assert!(!guest_agent_protocol_compatible(GUEST_AGENT_PROTOCOL_VERSION + 1));

        let mut status = GuestStatus {
            schema: GUEST_STATUS_SCHEMA,
            protocol_version: 0,
            agent_version: "9.9.9".into(),
            minecraft: None,
            minecraft_running: None,
            interactive_launcher_ready: None,
            machine_identity: None,
        };
        assert_eq!(
            validate_guest_status(&status).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );
        status.protocol_version = GUEST_AGENT_PROTOCOL_VERSION;
        validate_guest_status(&status).unwrap();
    }

    #[test]
    fn minecraft_launch_result_has_one_schema_owner() {
        let result = MinecraftLaunchResult {
            schema: MINECRAFT_LAUNCH_SCHEMA,
            state: MinecraftLaunchState::AlreadyRunning,
        };
        let json = serde_json::to_value(result).unwrap();
        assert_eq!(json["schema"], MINECRAFT_LAUNCH_SCHEMA);
        assert_eq!(json["state"], "ALREADY_RUNNING");
    }

    #[test]
    fn guest_status_round_trips() {
        let status = GuestStatus {
            schema: GUEST_STATUS_SCHEMA,
            protocol_version: GUEST_AGENT_PROTOCOL_VERSION,
            agent_version: "0.1.0".into(),
            minecraft: Some(MinecraftProfile {
                version: "1.21.120.0".into(),
                install_type: MinecraftInstallType::Desktop,
            }),
            minecraft_running: Some(true),
            interactive_launcher_ready: Some(true),
            machine_identity: Some("a".repeat(64)),
        };

        let json = serde_json::to_string(&status).unwrap();
        let decoded: GuestStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, status);
    }
}
