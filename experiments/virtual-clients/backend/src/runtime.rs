use crate::{
    client::{ClientId, ClientState, ClientStatus, IdentityState},
    doctor::{doctor, DoctorReport},
    profile::{profile_status, require_base_matches_native, ProfileStatus},
    provider::{cleanup_staging, current_platform_provider, runtime_root, Provider},
    resources::{current_host_pressure, start_delay_secs, HostPressure, VIRTUAL_MEMORY_LIMIT_MB},
};
use fs2::FileExt;
use serde::Serialize;
use std::{
    fs::{self, File, OpenOptions},
    io, thread,
    time::Duration,
};

#[derive(Debug, Default)]
pub struct VirtualClients;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub provider: Option<&'static str>,
    pub runtime_profile: ProfileStatus,
    pub pressure: HostPressure,
    pub clients: Vec<ClientStatus>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceView {
    pub requested_virtual_clients: usize,
    pub recommended_virtual_clients: usize,
    pub running_virtual_clients: usize,
    pub suspended_virtual_clients: usize,
    pub stopped_virtual_clients: usize,
    pub virtual_memory_limit_mb: u64,
    pub observed_working_set_mb: u64,
    pub observed_working_set_instances: usize,
    pub pressure: HostPressure,
}

struct OperationLock {
    file: File,
}

impl OperationLock {
    fn acquire() -> io::Result<Self> {
        let root = runtime_root()?;
        fs::create_dir_all(&root)?;
        let path = root.join(".operation.lock");
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;

        file.try_lock_exclusive().map_err(|error| {
            if error.kind() == io::ErrorKind::WouldBlock {
                io::Error::new(
                    io::ErrorKind::WouldBlock,
                    "another Virtual Clients operation is already running",
                )
            } else {
                error
            }
        })?;

        Ok(Self { file })
    }
}

impl Drop for OperationLock {
    fn drop(&mut self) {
        let _ = self.file.unlock();
    }
}

fn identity_state(provider: &dyn Provider, client: ClientId) -> IdentityState {
    let Ok(Some(identity)) = provider.identity_key(client) else {
        return IdentityState::Unknown;
    };

    for other in ClientId::VIRTUAL {
        if other == client {
            continue;
        }
        if provider.status(other).ok() == Some(ClientState::NotProvisioned) {
            continue;
        }
        if provider.identity_key(other).ok().flatten().as_deref() == Some(identity.as_str()) {
            return IdentityState::Duplicate;
        }
    }

    IdentityState::Unique
}

fn restore_batch_state(
    provider: &dyn Provider,
    started: &[(ClientId, ClientState)],
) -> Vec<&'static str> {
    let mut failed = Vec::new();

    for (client, original_state) in started.iter().rev() {
        let result = match original_state {
            ClientState::Suspended => provider.suspend(*client).map(|_| ()),
            ClientState::Stopped => provider.stop(*client).map(|_| ()),
            _ => Ok(()),
        };

        if result.is_err() {
            failed.push(client.as_str());
        }
    }

    failed
}

fn with_rollback_context(error: io::Error, failed: &[&'static str]) -> io::Error {
    if failed.is_empty() {
        return error;
    }

    io::Error::new(
        error.kind(),
        format!(
            "{error}; rollback incomplete for {}. Run status to inspect the current state.",
            failed.join(", ")
        ),
    )
}

fn working_set_for(working_sets: &[(ClientId, u64)], client: ClientId) -> Option<u64> {
    working_sets
        .iter()
        .find_map(|(candidate, memory_mb)| (*candidate == client).then_some(*memory_mb))
}

fn client_status(
    provider: &dyn Provider,
    working_sets: &[(ClientId, u64)],
    client: ClientId,
) -> io::Result<ClientStatus> {
    let state = provider.status(client)?;
    if state == ClientState::NotProvisioned {
        return Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state,
            ready_snapshot: Some(false),
            memory_limit_mb: None,
            host_working_set_mb: None,
            guest_tools_ready: None,
            identity: Some(IdentityState::Unknown),
        });
    }

    Ok(ClientStatus {
        id: client.as_str(),
        native: false,
        state,
        ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
        memory_limit_mb: provider.memory_limit_mb(client).ok(),
        host_working_set_mb: working_set_for(working_sets, client),
        guest_tools_ready: provider.guest_tools_ready(client).ok().flatten(),
        identity: Some(identity_state(provider, client)),
    })
}

impl VirtualClients {
    pub fn doctor(&self) -> DoctorReport {
        doctor()
    }

    pub fn provision(&self) -> io::Result<Vec<ClientStatus>> {
        require_base_matches_native()?;
        let _lock = OperationLock::acquire()?;
        cleanup_staging()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        for client in ClientId::VIRTUAL {
            provider.provision(client)?;
        }

        let working_sets = provider.host_working_sets_mb()?;
        let mut result = Vec::with_capacity(3);
        for client in ClientId::VIRTUAL {
            result.push(client_status(provider.as_ref(), &working_sets, client)?);
        }
        Ok(result)
    }

    pub fn reprovision(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native cannot be reprovisioned",
            ));
        }

        require_base_matches_native()?;

        let _lock = OperationLock::acquire()?;
        cleanup_staging()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        provider.reprovision(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        client_status(provider.as_ref(), &working_sets, client)
    }

    pub fn status(&self) -> io::Result<RuntimeStatus> {
        let provider = current_platform_provider();
        let mut clients = Vec::with_capacity(ClientId::ALL.len());

        clients.push(ClientStatus {
            id: ClientId::Native.as_str(),
            native: true,
            state: ClientState::Manual,
            ready_snapshot: None,
            memory_limit_mb: None,
            host_working_set_mb: None,
            guest_tools_ready: None,
            identity: None,
        });

        if let Some(provider) = provider.as_ref() {
            let working_sets = provider.host_working_sets_mb()?;
            for client in ClientId::VIRTUAL {
                clients.push(client_status(provider.as_ref(), &working_sets, client)?);
            }
        } else {
            for client in ClientId::VIRTUAL {
                clients.push(ClientStatus {
                    id: client.as_str(),
                    native: false,
                    state: ClientState::Error,
                    ready_snapshot: Some(false),
                    memory_limit_mb: None,
                    host_working_set_mb: None,
                    guest_tools_ready: None,
                    identity: Some(IdentityState::Unknown),
                });
            }
        }

        Ok(RuntimeStatus {
            provider: provider.as_ref().map(|provider| provider.id()),
            runtime_profile: profile_status(),
            pressure: current_host_pressure(),
            clients,
        })
    }

    pub fn resources(&self, count: usize) -> io::Result<ResourceView> {
        if !(1..=3).contains(&count) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "virtual client count must be between 1 and 3",
            ));
        }

        let host = doctor();

        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let mut running = 0;
        let mut suspended = 0;
        let mut stopped = 0;
        let working_sets = provider.host_working_sets_mb()?;
        let mut observed_working_set_mb = 0;
        let mut observed_working_set_instances = 0;

        for client in ClientId::VIRTUAL.into_iter().take(count) {
            match provider.status(client)? {
                ClientState::Running => running += 1,
                ClientState::Suspended => suspended += 1,
                ClientState::Stopped => stopped += 1,
                ClientState::NotProvisioned => {
                    return Err(io::Error::new(
                        io::ErrorKind::NotFound,
                        format!("{} is not provisioned", client.as_str()),
                    ));
                }
                _ => {
                    return Err(io::Error::new(
                        io::ErrorKind::Other,
                        format!("{} is not in a resource-manageable state", client.as_str()),
                    ));
                }
            }

            if let Some(memory_mb) = working_set_for(&working_sets, client) {
                observed_working_set_mb += memory_mb;
                observed_working_set_instances += 1;
            }
        }

        Ok(ResourceView {
            requested_virtual_clients: count,
            recommended_virtual_clients: host.max_recommended_virtual_clients,
            running_virtual_clients: running,
            suspended_virtual_clients: suspended,
            stopped_virtual_clients: stopped,
            virtual_memory_limit_mb: VIRTUAL_MEMORY_LIMIT_MB,
            observed_working_set_mb,
            observed_working_set_instances,
            pressure: current_host_pressure(),
        })
    }

    pub fn start(&self, count: usize) -> io::Result<Vec<ClientStatus>> {
        require_base_matches_native()?;
        let resources = self.resources(count)?;
        let inactive = resources.suspended_virtual_clients + resources.stopped_virtual_clients;

        if inactive > 0 && !resources.pressure.can_start_virtual {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!(
                    "host memory pressure is {:?}; suspend another Virtual or free host memory before starting more instances",
                    resources.pressure.level
                ),
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let targets: Vec<ClientId> = ClientId::VIRTUAL.into_iter().take(count).collect();
        let mut result = Vec::with_capacity(count);
        let mut started_by_batch: Vec<(ClientId, ClientState)> = Vec::new();

        for (index, client) in targets.into_iter().enumerate() {
            let original_state = provider.status(client)?;

            if original_state != ClientState::Running {
                let live_pressure = current_host_pressure();
                if !live_pressure.can_start_virtual {
                    let rollback_failed = restore_batch_state(provider.as_ref(), &started_by_batch);
                    let error = io::Error::new(
                        io::ErrorKind::Other,
                        format!(
                            "host memory pressure became {:?} before starting {}",
                            live_pressure.level,
                            client.as_str()
                        ),
                    );
                    return Err(with_rollback_context(error, &rollback_failed));
                }
            }

            if identity_state(provider.as_ref(), client) == IdentityState::Duplicate {
                let rollback_failed = restore_batch_state(provider.as_ref(), &started_by_batch);
                let error = io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("{} has duplicate VM identity", client.as_str()),
                );
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if let Err(error) = provider.start(client) {
                let rollback_failed = restore_batch_state(provider.as_ref(), &started_by_batch);
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if original_state != ClientState::Running {
                started_by_batch.push((client, original_state));
            }

            if identity_state(provider.as_ref(), client) == IdentityState::Duplicate {
                let mut rollback_failed = Vec::new();
                if provider.stop(client).is_err() {
                    rollback_failed.push(client.as_str());
                }
                started_by_batch.retain(|(started, _)| *started != client);
                rollback_failed.extend(restore_batch_state(provider.as_ref(), &started_by_batch));
                let error = io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "{} received duplicate VM identity after start",
                        client.as_str()
                    ),
                );
                return Err(with_rollback_context(error, &rollback_failed));
            }

            let working_sets = provider.host_working_sets_mb()?;
            result.push(client_status(provider.as_ref(), &working_sets, client)?);

            if index + 1 < count {
                let delay = start_delay_secs(current_host_pressure().level);
                thread::sleep(Duration::from_secs(delay));
            }
        }

        Ok(result)
    }

    pub fn suspend(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        if client.is_some_and(ClientId::is_native) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native cannot be suspended by Runtime Lab",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let targets: Vec<ClientId> = match client {
            Some(client) => vec![client],
            None => ClientId::VIRTUAL
                .into_iter()
                .filter(|client| provider.status(*client).ok() != Some(ClientState::NotProvisioned))
                .collect(),
        };

        let mut suspended_by_batch = Vec::new();
        let mut result = Vec::with_capacity(targets.len());

        for client in &targets {
            let client = *client;
            let original_state = provider.status(client)?;
            if let Err(error) = provider.suspend(client) {
                let mut rollback_failed = Vec::new();
                for suspended in suspended_by_batch.into_iter().rev() {
                    if provider.start(suspended).is_err() {
                        rollback_failed.push(suspended.as_str());
                    }
                }
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if original_state == ClientState::Running {
                suspended_by_batch.push(client);
            }
        }

        let working_sets = provider.host_working_sets_mb()?;
        for client in targets {
            result.push(client_status(provider.as_ref(), &working_sets, client)?);
        }
        Ok(result)
    }

    pub fn stop(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        if client.is_some_and(ClientId::is_native) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native lifecycle is managed manually on the host",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let targets: Vec<ClientId> = match client {
            Some(client) => vec![client],
            None => ClientId::VIRTUAL
                .into_iter()
                .filter(|client| provider.status(*client).ok() != Some(ClientState::NotProvisioned))
                .collect(),
        };

        let mut result = Vec::with_capacity(targets.len());
        for client in &targets {
            provider.stop(*client)?;
        }

        let working_sets = provider.host_working_sets_mb()?;
        for client in targets {
            result.push(client_status(provider.as_ref(), &working_sets, client)?);
        }
        Ok(result)
    }

    pub fn restart(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native cannot be VM-restarted",
            ));
        }

        require_base_matches_native()?;

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        provider.restart(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        client_status(provider.as_ref(), &working_sets, client)
    }

    pub fn set_ready(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native does not use QA_READY snapshots",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        provider.set_ready(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        client_status(provider.as_ref(), &working_sets, client)
    }

    pub fn reset(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native does not use VM clean-state reset",
            ));
        }

        require_base_matches_native()?;

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        provider.reset(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        client_status(provider.as_ref(), &working_sets, client)
    }

    pub fn open(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native is opened manually on the host",
            ));
        }

        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        provider.open(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        client_status(provider.as_ref(), &working_sets, client)
    }
}
