use super::Provider;
use crate::client::{ClientId, ClientState};
use std::{
    io,
    path::{Path, PathBuf},
};

const CANDIDATES: [&str; 2] = [
    r"C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe",
    r"C:\Program Files\VMware\VMware Workstation\vmrun.exe",
];

#[derive(Debug, Default)]
pub struct VmwareWorkstationProvider {
    vmrun: Option<PathBuf>,
}

impl VmwareWorkstationProvider {
    fn executable(&self) -> Option<&Path> {
        self.vmrun.as_deref().or_else(|| {
            CANDIDATES
                .iter()
                .map(Path::new)
                .find(|path| path.is_file())
        })
    }

    fn not_provisioned(client: ClientId) -> io::Error {
        io::Error::new(
            io::ErrorKind::NotFound,
            format!("{} is not provisioned yet", client.as_str()),
        )
    }
}

impl Provider for VmwareWorkstationProvider {
    fn id(&self) -> &'static str {
        "vmware-workstation"
    }

    fn detect(&self) -> bool {
        self.executable().is_some()
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
