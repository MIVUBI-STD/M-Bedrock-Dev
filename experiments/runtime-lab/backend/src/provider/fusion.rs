use super::Provider;
use crate::client::{ClientId, ClientState};
use std::{
    io,
    path::Path,
};

const VMRUN: &str = "/Applications/VMware Fusion.app/Contents/Library/vmrun";

#[derive(Debug, Default)]
pub struct VmwareFusionProvider;

impl VmwareFusionProvider {
    fn not_provisioned(client: ClientId) -> io::Error {
        io::Error::new(
            io::ErrorKind::NotFound,
            format!("{} is not provisioned yet", client.as_str()),
        )
    }
}

impl Provider for VmwareFusionProvider {
    fn id(&self) -> &'static str {
        "vmware-fusion"
    }

    fn detect(&self) -> bool {
        Path::new(VMRUN).is_file()
    }

    fn status(&self, _client: ClientId) -> io::Result<ClientState> {
        Ok(ClientState::NotProvisioned)
    }

    fn start(&self, client: ClientId) -> io::Result<ClientState> {
        Err(Self::not_provisioned(client))
    }

    fn stop(&self, client: ClientId) -> io::Result<ClientState> {
        Err(Self::not_provisioned(client))
    }

    fn reset(&self, client: ClientId) -> io::Result<ClientState> {
        Err(Self::not_provisioned(client))
    }

    fn open(&self, client: ClientId) -> io::Result<ClientState> {
        Err(Self::not_provisioned(client))
    }
}
