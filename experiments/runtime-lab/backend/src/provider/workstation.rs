use super::{
    base_vmx_path, client_vmx_path, command_output, ensure_parent, listed_as_running,
    promote_staging_vm, remove_vm_container, staging_client_vmx_path, Provider,
};
use crate::client::{ClientId, ClientState};
use std::{
    io,
    path::{Path, PathBuf},
    process::Command,
};

const VMRUN_CANDIDATES: [&str; 2] = [
    r"C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe",
    r"C:\Program Files\VMware\VMware Workstation\vmrun.exe",
];

const GUI_CANDIDATES: [&str; 2] = [
    r"C:\Program Files (x86)\VMware\VMware Workstation\vmware.exe",
    r"C:\Program Files\VMware\VMware Workstation\vmware.exe",
];

#[derive(Debug, Default)]
pub struct VmwareWorkstationProvider;

impl VmwareWorkstationProvider {
    fn vmrun(&self) -> Option<&'static Path> {
        VMRUN_CANDIDATES.iter().map(Path::new).find(|path| path.is_file())
    }

    fn gui(&self) -> Option<&'static Path> {
        GUI_CANDIDATES.iter().map(Path::new).find(|path| path.is_file())
    }

    fn require_vmrun(&self) -> io::Result<&'static Path> {
        self.vmrun().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "VMware Workstation vmrun.exe was not found")
        })
    }

    fn require_client(&self, client: ClientId) -> io::Result<PathBuf> {
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
        let output = command_output(self.require_vmrun()?, ["-T", "ws", "list"])?;
        Ok(listed_as_running(&output, vmx))
    }
}

impl Provider for VmwareWorkstationProvider {
    fn id(&self) -> &'static str {
        "vmware-workstation"
    }

    fn detect(&self) -> bool {
        self.vmrun().is_some()
    }

    fn is_running_path(&self, vmx: &Path) -> io::Result<bool> {
        self.running(vmx)
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
        if self.running(&base)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "base VM must be powered off before provisioning",
            ));
        }

        let staging = staging_client_vmx_path(client)?;
        remove_vm_container(&staging);
        ensure_parent(&staging)?;

        let clone_name = format!("-cloneName={}", client.as_str());
        let clone_result = command_output(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "clone",
                base.to_string_lossy().as_ref(),
                staging.to_string_lossy().as_ref(),
                "linked",
                clone_name.as_str(),
            ],
        );

        if let Err(error) = clone_result {
            remove_vm_container(&staging);
            return Err(error);
        }

        if let Err(error) = promote_staging_vm(&staging, &target) {
            remove_vm_container(&staging);
            return Err(error);
        }

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
            self.require_vmrun()?,
            ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "gui"],
        )?;
        Ok(ClientState::Ready)
    }

    fn stop(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            return Ok(ClientState::Stopped);
        }

        command_output(
            self.require_vmrun()?,
            ["-T", "ws", "stop", vmx.to_string_lossy().as_ref(), "soft"],
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
            self.require_vmrun()?,
            ["-T", "ws", "reset", vmx.to_string_lossy().as_ref(), "soft"],
        )?;
        Ok(ClientState::Ready)
    }

    fn open(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        let gui = self.gui().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "VMware Workstation UI was not found")
        })?;

        Command::new(gui).arg("-t").arg(&vmx).spawn()?;
        self.status(client)
    }
}
