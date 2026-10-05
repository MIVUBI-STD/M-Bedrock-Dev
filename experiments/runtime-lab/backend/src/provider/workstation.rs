use super::{
    apply_client_cpu_policy, base_vmx_path, client_vmx_path, command_output, ensure_parent, listed_as_running,
    read_vmx_memory, set_vmx_memory,
    promote_staging_vm, remove_vm_container, snapshot_list_contains, staging_client_vmx_path,
    wait_for_state, Provider, READY_SNAPSHOT,
};
use crate::client::{ClientId, ClientState};
use std::{
    io,
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
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

        if let Err(error) = apply_client_resource_policy(&staging) {
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
            ClientState::Running
        } else {
            ClientState::Stopped
        })
    }

    fn reprovision(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = client_vmx_path(client)?;
        if vmx.is_file() && self.running(&vmx)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} must be stopped before reprovision", client.as_str()),
            ));
        }
        remove_vm_container(&vmx);
        self.provision(client)
    }

    fn configure_memory(&self, client: ClientId, memory_mb: u64) -> io::Result<()> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} must be stopped before changing memory", client.as_str()),
            ));
        }
        set_vmx_memory(&vmx, memory_mb)
    }

    fn memory_mb(&self, client: ClientId) -> io::Result<u64> {
        let vmx = self.require_client(client)?;
        read_vmx_memory(&vmx)
    }

    fn start(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? {
            return Ok(ClientState::Running);
        }

        command_output(
            self.require_vmrun()?,
            ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "gui"],
        )?;
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
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

        if wait_for_state(|| self.running(&vmx), false, Duration::from_secs(12)).is_err() {
            command_output(
                self.require_vmrun()?,
                ["-T", "ws", "stop", vmx.to_string_lossy().as_ref(), "hard"],
            )?;
            wait_for_state(|| self.running(&vmx), false, Duration::from_secs(5))?;
        }

        Ok(ClientState::Stopped)
    }

    fn restart(&self, client: ClientId) -> io::Result<ClientState> {
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
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
    }

    fn has_ready(&self, client: ClientId) -> io::Result<bool> {
        let vmx = self.require_client(client)?;
        let output = command_output(
            self.require_vmrun()?,
            ["-T", "ws", "listSnapshots", vmx.to_string_lossy().as_ref()],
        )?;
        Ok(snapshot_list_contains(&output, READY_SNAPSHOT))
    }

    fn set_ready(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} must be stopped before setting QA_READY", client.as_str()),
            ));
        }
        if self.has_ready(client)? {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("{} already has QA_READY", client.as_str()),
            ));
        }

        command_output(
            self.require_vmrun()?,
            ["-T", "ws", "snapshot", vmx.to_string_lossy().as_ref(), READY_SNAPSHOT],
        )?;
        Ok(ClientState::Stopped)
    }

    fn reset(&self, client: ClientId, memory_mb: u64) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.has_ready(client)? {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("{} has no QA_READY snapshot", client.as_str()),
            ));
        }

        if self.running(&vmx)? {
            self.stop(client)?;
        }

        command_output(
            self.require_vmrun()?,
            ["-T", "ws", "revertToSnapshot", vmx.to_string_lossy().as_ref(), READY_SNAPSHOT],
        )?;
        set_vmx_memory(&vmx, memory_mb)?;
        command_output(
            self.require_vmrun()?,
            ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "gui"],
        )?;
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
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
