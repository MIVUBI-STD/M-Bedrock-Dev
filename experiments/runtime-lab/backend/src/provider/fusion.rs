use super::{
    apply_virtual_hardware_policy, base_vmx_path, client_vmx_path, command_output, ensure_parent, has_suspend_state,
    host_working_set_mb, listed_as_running, read_vmx_memory, read_vmx_value,
    promote_staging_vm, remove_vm_container, snapshot_list_contains, staging_client_vmx_path,
    wait_for_state, MemoryMode, Provider, READY_SNAPSHOT,
};
use crate::client::{ClientId, ClientState};
use std::{io, path::Path, process::Command, time::Duration};

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

    fn memory_mode(&self) -> MemoryMode {
        MemoryMode::Ceiling
    }

    fn detect(&self) -> bool {
        self.vmrun().is_file()
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
            self.vmrun(),
            [
                "-T",
                "fusion",
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

        if let Err(error) = apply_virtual_hardware_policy(&staging) {
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
        } else if has_suspend_state(&vmx) {
            ClientState::Suspended
        } else {
            ClientState::Stopped
        })
    }

    fn reprovision(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = client_vmx_path(client)?;
        if vmx.is_file() && (self.running(&vmx)? || has_suspend_state(&vmx)) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} must be fully stopped before reprovision", client.as_str()),
            ));
        }
        remove_vm_container(&vmx);
        self.provision(client)
    }

    fn memory_limit_mb(&self, client: ClientId) -> io::Result<u64> {
        let vmx = self.require_client(client)?;
        read_vmx_memory(&vmx)
    }

    fn host_working_set_mb(&self, client: ClientId) -> io::Result<Option<u64>> {
        let vmx = self.require_client(client)?;
        Ok(host_working_set_mb(&vmx))
    }

    fn identity_key(&self, client: ClientId) -> io::Result<Option<String>> {
        let vmx = self.require_client(client)?;
        let uuid = read_vmx_value(&vmx, "uuid.bios")?;
        let mac = read_vmx_value(&vmx, "ethernet0.generatedAddress")?;

        Ok(match (uuid, mac) {
            (None, None) => None,
            (uuid, mac) => Some(format!(
                "{}|{}",
                uuid.unwrap_or_default(),
                mac.unwrap_or_default()
            )),
        })
    }

    fn start(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? {
            return Ok(ClientState::Running);
        }

        command_output(
            self.vmrun(),
            ["-T", "fusion", "start", vmx.to_string_lossy().as_ref(), "gui"],
        )?;
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
    }

    fn suspend(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            return Ok(if has_suspend_state(&vmx) {
                ClientState::Suspended
            } else {
                ClientState::Stopped
            });
        }

        command_output(
            self.vmrun(),
            ["-T", "fusion", "suspend", vmx.to_string_lossy().as_ref(), "soft"],
        )?;
        wait_for_state(|| self.running(&vmx), false, Duration::from_secs(15))?;
        Ok(ClientState::Suspended)
    }

    fn stop(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            if has_suspend_state(&vmx) {
                command_output(
                    self.vmrun(),
                    ["-T", "fusion", "start", vmx.to_string_lossy().as_ref(), "nogui"],
                )?;
                wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
            } else {
                return Ok(ClientState::Stopped);
            }
        }

        command_output(
            self.vmrun(),
            ["-T", "fusion", "stop", vmx.to_string_lossy().as_ref(), "soft"],
        )?;

        if wait_for_state(|| self.running(&vmx), false, Duration::from_secs(12)).is_err() {
            command_output(
                self.vmrun(),
                ["-T", "fusion", "stop", vmx.to_string_lossy().as_ref(), "hard"],
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
            self.vmrun(),
            ["-T", "fusion", "reset", vmx.to_string_lossy().as_ref(), "soft"],
        )?;
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
    }

    fn has_ready(&self, client: ClientId) -> io::Result<bool> {
        let vmx = self.require_client(client)?;
        let output = command_output(
            self.vmrun(),
            ["-T", "fusion", "listSnapshots", vmx.to_string_lossy().as_ref()],
        )?;
        Ok(snapshot_list_contains(&output, READY_SNAPSHOT))
    }

    fn set_ready(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? || has_suspend_state(&vmx) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("{} must be fully stopped before setting QA_READY", client.as_str()),
            ));
        }
        if self.has_ready(client)? {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("{} already has QA_READY", client.as_str()),
            ));
        }

        command_output(
            self.vmrun(),
            ["-T", "fusion", "snapshot", vmx.to_string_lossy().as_ref(), READY_SNAPSHOT],
        )?;
        Ok(ClientState::Stopped)
    }

    fn reset(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.has_ready(client)? {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("{} has no QA_READY snapshot", client.as_str()),
            ));
        }

        if self.running(&vmx)? || has_suspend_state(&vmx) {
            self.stop(client)?;
        }

        command_output(
            self.vmrun(),
            ["-T", "fusion", "revertToSnapshot", vmx.to_string_lossy().as_ref(), READY_SNAPSHOT],
        )?;
        command_output(
            self.vmrun(),
            ["-T", "fusion", "start", vmx.to_string_lossy().as_ref(), "gui"],
        )?;
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
    }

    fn open(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        Command::new("open").arg(&vmx).spawn()?;
        self.status(client)
    }
}
