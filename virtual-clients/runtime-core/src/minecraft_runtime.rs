use std::{io, time::Duration};

const GUEST_STATUS_TIMEOUT: Duration = Duration::from_secs(2);
const MINECRAFT_LAUNCH_REQUEST_TIMEOUT: Duration = Duration::from_secs(40);

use crate::{
    client::ClientId,
    guest::{
        guest_agent_launch_compatible, launch_guest_minecraft, query_guest_status,
        GUEST_AGENT_PROTOCOL_VERSION,
    },
    paths::guest_token,
    provider::Provider,
};

pub fn ensure_running(provider: &dyn Provider, client: ClientId) -> io::Result<()> {
    let ip = provider.guest_ip_address(client)?.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::AddrNotAvailable,
            format!("{} guest IP is unavailable", client.as_str()),
        )
    })?;
    let token = guest_token(client)?.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            format!("{} Guest Agent token is missing", client.as_str()),
        )
    })?;
    let status = query_guest_status(&ip, &token, GUEST_STATUS_TIMEOUT)?;
    if !guest_agent_launch_compatible(status.protocol_version) {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            format!(
                "{} Guest Agent protocol {} does not support Minecraft auto-launch; protocol {} is required",
                client.as_str(),
                status.protocol_version,
                GUEST_AGENT_PROTOCOL_VERSION
            ),
        ));
    }
    if status.interactive_launcher_ready != Some(true) {
        return Err(io::Error::new(
            io::ErrorKind::NotConnected,
            format!(
                "{} interactive launcher is not active; complete per-user launcher setup inside that Virtual",
                client.as_str()
            ),
        ));
    }
    launch_guest_minecraft(&ip, &token, MINECRAFT_LAUNCH_REQUEST_TIMEOUT).map(|_| ())
}
