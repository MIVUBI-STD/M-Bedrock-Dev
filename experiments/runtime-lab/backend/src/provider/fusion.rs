use super::{
    base_vmx_path, client_vmx_path, command_output, ensure_parent, listed_as_running, Provider,
};
use crate::client::{ClientId, ClientState};
use std::{io, path::Path, process::Command};

const VMRUN: &str = "/Applications/VMware Fusion.app/Contents/Library/vmrun";

#[derive(Debug, Default)]
pub struct VmwareFusionProvider;

impl VmwareFusionProvider {
    fn vmrun(&self) -> &'static Path {
        Path::new(VMRUN)
    }

    fn require_client(&self, client: ClientId) -> io::Result<std::path::PathBuf> {
        let path = client_vmx_path(client)?;
        if path.is_file() {
            Ok(path)
        } else {
            Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("{} is not provisioned", client.as_str()),
            ))
        }
    }

    fn running(&self, vmx: &Path) -> io::Result<bool> {
        let output = command_output(self.vmrun(), ["-T", "fusion", "list"])?;
        Ok(listed_as_running(&output, vmx))
    }
}

impl Provider for VmwareFusionProvider {
    fn id(&self) -> &'static str {
        "vmware-fusion"
    }

    fn detect(&self) -> bool {
        self.vmrun().is_file()
    }

    fn provision(&self, client: ClientId) -> io::Result<ClientState> {
        let target = client_vmx_path(client)?;
        if target.is_file() {
            return self.status(client);
        }

        let base = base_vmx_path()?;
        if !base.is_file() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("base VM is missing: {}", base.display()),
            ));
        }

        ensure_parent(&target)?;
        let clone_name = format!("-cloneName={}", client.as_str());
        command_output(
            self.vmrun(),
            [
                "-T",
                "fusion",
                "clone",
                base.to_string_lossy().as_ref(),
                target.to_string_lossy().as_ref(),
                "linked",
                clone_name.as_str(),
            ],
        )?;

        Ok(ClientState::Stopped)
    }

    fn status(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = client_vmx_path(client)?;
        if !vmx.is_file() {
            return Ok(ClientState::NotProvisioned);
        }
        Ok(if self.running(&vmx)? {
            ClientState::Ready
        } else {
            ClientState::Stopped
        })
    }

    fn start(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? {
            return Ok(ClientState::Ready);
        }

        command_output(
            self.vmrun(),
            [
                "-T",
                "fusion",
                "start",
                vmx.to_string_lossy().as_ref(),
                "gui",
            ],
        )?;
        Ok(ClientState::Ready)
    }

    fn stop(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            return Ok(ClientState::Stopped);
        }

        command_output(
            self.vmrun(),
            [
                "-T",
                "fusion",
                "stop",
                vmx.to_string_lossy().as_ref(),
                "soft",
            ],
        )?;
        Ok(ClientState::Stopped)
    }

    fn reset(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} is not running", client.as_str()),
            ));
        }

        command_output(
            self.vmrun(),
            [
                "-T",
                "fusion",
                "reset",
                vmx.to_string_lossy().as_ref(),
                "soft",
            ],
        )?;
        Ok(ClientState::Ready)
    }

    fn open(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        Command::new("open").arg(&vmx).spawn()?;
        self.status(client)
    }
}
