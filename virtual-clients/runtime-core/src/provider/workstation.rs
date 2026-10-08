use super::{
    apply_virtual_hardware_policy, base_vmx_path, client_vmx_path, command_output,
    command_output_with_timeout, ensure_parent, guest_tools_state_ready, has_suspend_state,
    listed_as_running, parse_guest_ip, promote_staging_vm, read_vmx_memory, remove_vm_container,
    snapshot_list_contains, staging_client_vmx_path, vm_identity_key, wait_for_state, Provider,
    DISK_STATE_TIMEOUT,
};
use crate::client::{ClientId, ClientState};
use crate::policy::READY_SNAPSHOT_NAME;
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
        VMRUN_CANDIDATES
            .iter()
            .map(Path::new)
            .find(|path| path.is_file())
    }

    fn gui(&self) -> Option<&'static Path> {
        GUI_CANDIDATES
            .iter()
            .map(Path::new)
            .find(|path| path.is_file())
    }

    fn require_vmrun(&self) -> io::Result<&'static Path> {
        self.vmrun().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "VMware Workstation vmrun.exe was not found",
            )
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

    fn version(&self) -> Option<String> {
        let gui = self.gui()?;
        let output = Command::new(gui).arg("-v").output().ok()?;
        let text = if output.stdout.is_empty() {
            String::from_utf8_lossy(&output.stderr).trim().to_string()
        } else {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        };
        (!text.is_empty()).then_some(text)
    }

    fn detect(&self) -> bool {
        self.vmrun().is_some()
    }

    fn is_running_path(&self, vmx: &Path) -> io::Result<bool> {
        self.running(vmx)
    }

    fn start_validation_vm(&self, vmx: &Path) -> io::Result<()> {
        if self.running(vmx)? {
            return Ok(());
        }
        command_output_with_timeout(
            self.require_vmrun()?,
            ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "nogui"],
            DISK_STATE_TIMEOUT,
        )?;
        wait_for_state(|| self.running(vmx), true, DISK_STATE_TIMEOUT)
    }

    fn stop_validation_vm(&self, vmx: &Path) -> io::Result<()> {
        if !self.running(vmx)? {
            return Ok(());
        }

        command_output(
            self.require_vmrun()?,
            ["-T", "ws", "stop", vmx.to_string_lossy().as_ref(), "soft"],
        )?;

        if wait_for_state(|| self.running(vmx), false, Duration::from_secs(20)).is_err() {
            command_output(
                self.require_vmrun()?,
                ["-T", "ws", "stop", vmx.to_string_lossy().as_ref(), "hard"],
            )?;
            wait_for_state(|| self.running(vmx), false, Duration::from_secs(10))?;
        }

        Ok(())
    }

    fn guest_ip_for_path(&self, vmx: &Path) -> io::Result<Option<String>> {
        if !self.running(vmx)? {
            return Ok(None);
        }

        match command_output_with_timeout(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "getGuestIPAddress",
                vmx.to_string_lossy().as_ref(),
            ],
            Duration::from_secs(5),
        ) {
            Ok(output) => Ok(parse_guest_ip(&output)),
            Err(_) => Ok(None),
        }
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
        remove_vm_container(&staging)?;
        ensure_parent(&staging)?;

        let clone_name = format!("-cloneName={}", client.as_str());
        let clone_result = command_output_with_timeout(
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
            DISK_STATE_TIMEOUT,
        );

        if let Err(error) = clone_result {
            // A staged VMX does not prove that VMware finished cloning its disks.
            // Never promote an ambiguous or failed clone as a usable client.
            let _ = remove_vm_container(&staging);
            return Err(error);
        }

        if let Err(error) = apply_virtual_hardware_policy(&staging) {
            let _ = remove_vm_container(&staging);
            return Err(error);
        }

        if let Err(error) = promote_staging_vm(&staging, &target) {
            let _ = remove_vm_container(&staging);
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
                format!(
                    "{} must be fully stopped before reprovision",
                    client.as_str()
                ),
            ));
        }
        remove_vm_container(&vmx)?;
        self.provision(client)
    }

    fn memory_limit_mb(&self, client: ClientId) -> io::Result<u64> {
        let vmx = self.require_client(client)?;
        read_vmx_memory(&vmx)
    }

    fn guest_tools_ready(&self, client: ClientId) -> io::Result<Option<bool>> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            return Ok(Some(false));
        }

        match command_output(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "checkToolsState",
                vmx.to_string_lossy().as_ref(),
            ],
        ) {
            Ok(state) => Ok(Some(guest_tools_state_ready(&state))),
            Err(_) => Ok(None),
        }
    }

    fn guest_ip_address(&self, client: ClientId) -> io::Result<Option<String>> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            return Ok(None);
        }

        match command_output_with_timeout(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "getGuestIPAddress",
                vmx.to_string_lossy().as_ref(),
            ],
            Duration::from_secs(5),
        ) {
            Ok(output) => Ok(parse_guest_ip(&output)),
            Err(_) => Ok(None),
        }
    }

    fn identity_key(&self, client: ClientId) -> io::Result<Option<String>> {
        let vmx = self.require_client(client)?;
        vm_identity_key(&vmx)
    }

    fn start(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? {
            return Ok(ClientState::Running);
        }

        let resume = has_suspend_state(&vmx);
        if resume {
            let result = command_output_with_timeout(
                self.require_vmrun()?,
                ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "gui"],
                DISK_STATE_TIMEOUT,
            );
            if let Err(error) = result {
                // vmrun may time out after the resume mutation has already
                // completed. Reconcile observed provider state before surfacing
                // an unknown-mutation failure to the lifecycle owner.
                if self.running(&vmx).unwrap_or(false) {
                    return Ok(ClientState::Running);
                }
                return Err(error);
            }
            wait_for_state(|| self.running(&vmx), true, DISK_STATE_TIMEOUT)?;
        } else {
            let result = command_output(
                self.require_vmrun()?,
                ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "gui"],
            );
            if let Err(error) = result {
                if self.running(&vmx).unwrap_or(false) {
                    return Ok(ClientState::Running);
                }
                return Err(error);
            }
            wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        }
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

        let result = command_output_with_timeout(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "suspend",
                vmx.to_string_lossy().as_ref(),
                "soft",
            ],
            DISK_STATE_TIMEOUT,
        );
        if let Err(error) = result {
            if !self.running(&vmx).unwrap_or(true) && has_suspend_state(&vmx) {
                return Ok(ClientState::Suspended);
            }
            return Err(error);
        }
        wait_for_state(|| self.running(&vmx), false, DISK_STATE_TIMEOUT)?;
        Ok(ClientState::Suspended)
    }

    fn stop(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if !self.running(&vmx)? {
            if has_suspend_state(&vmx) {
                command_output_with_timeout(
                    self.require_vmrun()?,
                    ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "nogui"],
                    DISK_STATE_TIMEOUT,
                )?;
                wait_for_state(|| self.running(&vmx), true, DISK_STATE_TIMEOUT)?;
            } else {
                return Ok(ClientState::Stopped);
            }
        }

        let soft_stop = command_output(
            self.require_vmrun()?,
            ["-T", "ws", "stop", vmx.to_string_lossy().as_ref(), "soft"],
        );
        if let Err(error) = soft_stop {
            if !self.running(&vmx).unwrap_or(true) && !has_suspend_state(&vmx) {
                return Ok(ClientState::Stopped);
            }
            return Err(error);
        }

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

        let result = command_output(
            self.require_vmrun()?,
            ["-T", "ws", "reset", vmx.to_string_lossy().as_ref(), "soft"],
        );
        if let Err(error) = result {
            if self.running(&vmx).unwrap_or(false) {
                return Ok(ClientState::Running);
            }
            return Err(error);
        }
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
    }

    fn has_ready(&self, client: ClientId) -> io::Result<bool> {
        let vmx = self.require_client(client)?;
        let output = command_output(
            self.require_vmrun()?,
            ["-T", "ws", "listSnapshots", vmx.to_string_lossy().as_ref()],
        )?;
        Ok(snapshot_list_contains(&output, READY_SNAPSHOT_NAME))
    }

    fn set_ready(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        if self.running(&vmx)? || has_suspend_state(&vmx) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "{} must be fully stopped before setting QA_READY",
                    client.as_str()
                ),
            ));
        }
        if self.has_ready(client)? {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!("{} already has QA_READY", client.as_str()),
            ));
        }

        let result = command_output_with_timeout(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "snapshot",
                vmx.to_string_lossy().as_ref(),
                READY_SNAPSHOT_NAME,
            ],
            DISK_STATE_TIMEOUT,
        );
        if let Err(error) = result {
            if self.has_ready(client).unwrap_or(false) {
                return Ok(ClientState::Stopped);
            }
            return Err(error);
        }
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

        let revert = command_output_with_timeout(
            self.require_vmrun()?,
            [
                "-T",
                "ws",
                "revertToSnapshot",
                vmx.to_string_lossy().as_ref(),
                READY_SNAPSHOT_NAME,
            ],
            DISK_STATE_TIMEOUT,
        );
        if let Err(error) = revert {
            // Snapshot revert has no cheap provider fact that proves the exact
            // disk state reached. Do not replay an unknown destructive mutation.
            return Err(io::Error::new(
                error.kind(),
                format!("QA_READY revert outcome is unknown; inspect the VM before retrying: {error}"),
            ));
        }
        let start = command_output(
            self.require_vmrun()?,
            ["-T", "ws", "start", vmx.to_string_lossy().as_ref(), "gui"],
        );
        if let Err(error) = start {
            if self.running(&vmx).unwrap_or(false) {
                return Ok(ClientState::Running);
            }
            return Err(error);
        }
        wait_for_state(|| self.running(&vmx), true, Duration::from_secs(15))?;
        Ok(ClientState::Running)
    }

    fn open(&self, client: ClientId) -> io::Result<ClientState> {
        let vmx = self.require_client(client)?;
        self.open_vm_ui(&vmx)?;
        self.status(client)
    }

    fn open_vm_ui(&self, vmx: &Path) -> io::Result<()> {
        let gui = self.gui().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "VMware Workstation UI was not found",
            )
        })?;
        Command::new(gui).arg("-n").arg(vmx).spawn()?;
        Ok(())
    }
}
