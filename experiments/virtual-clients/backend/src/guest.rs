use serde::{Deserialize, Serialize};
use std::{
    io::{self, Read, Write},
    net::{TcpStream, ToSocketAddrs},
    time::Duration,
};

use crate::profile::MinecraftProfile;

pub const GUEST_AGENT_PORT: u16 = 47831;
pub const GUEST_STATUS_SCHEMA: u32 = 2;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuestStatus {
    pub schema: u32,
    pub agent_version: String,
    pub minecraft: Option<MinecraftProfile>,
    pub machine_identity: Option<String>,
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
    let request = format!(
        "GET /status HTTP/1.1\r\nHost: virtual-client\r\nX-Virtual-Clients-Token: {token}\r\nConnection: close\r\n\r\n"
    );
    stream.write_all(request.as_bytes())?;

    let mut response = Vec::new();
    stream.take(32 * 1024).read_to_end(&mut response)?;
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
    use super::{validate_guest_status, GuestStatus, GUEST_STATUS_SCHEMA};
    use crate::profile::{MinecraftInstallType, MinecraftProfile};
    use std::io;

    #[test]
    fn guest_identity_fingerprint_format_is_strict() {
        let mut status = GuestStatus {
            schema: GUEST_STATUS_SCHEMA,
            agent_version: "0.1.0".into(),
            minecraft: None,
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
    fn guest_status_round_trips() {
        let status = GuestStatus {
            schema: GUEST_STATUS_SCHEMA,
            agent_version: "0.1.0".into(),
            minecraft: Some(MinecraftProfile {
                version: "1.21.120.0".into(),
                install_type: MinecraftInstallType::Desktop,
            }),
            machine_identity: Some("a".repeat(64)),
        };

        let json = serde_json::to_string(&status).unwrap();
        let decoded: GuestStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, status);
    }
}
