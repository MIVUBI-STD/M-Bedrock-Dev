use crate::{
    client::{ClientId, ClientState, ClientStatus},
    doctor::{doctor, DoctorReport},
    provider::{current_platform_provider, runtime_root},
    resources::plan_memory,
};
use fs2::FileExt;
use serde::Serialize;
use std::{
    fs::{self, File, OpenOptions},
    io,
    thread,
    time::Duration,
};

#[derive(Debug, Default)]
pub struct RuntimeLab;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub provider: Option<&'static str>,
    pub clients: Vec<ClientStatus>,
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
                    "another Runtime Lab operation is already running",
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

fn available_memory_mb(report: &DoctorReport) -> u64 {
    (report.available_memory_gb * 1024.0).floor().max(0.0) as u64
}

impl RuntimeLab {
    pub fn doctor(&self) -> DoctorReport {
        doctor()
    }

    pub fn provision(&self) -> io::Result<Vec<ClientStatus>> {
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        let mut result = Vec::with_capacity(3);
        for client in ClientId::ALL.into_iter().filter(|client| !client.is_native()) {
            let state = provider.provision(client)?;
            result.push(ClientStatus {
                id: client.as_str(),
                native: false,
                state,
                ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
                memory_mb: provider.memory_mb(client).ok(),
            });
        }
        Ok(result)
    }

    pub fn reprovision(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "native client cannot be reprovisioned",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        let state = provider.reprovision(client)?;
        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state,
            ready_snapshot: Some(false),
            memory_mb: provider.memory_mb(client).ok(),
        })
    }

    pub fn status(&self) -> io::Result<RuntimeStatus> {
        let provider = current_platform_provider();
        let mut clients = Vec::with_capacity(ClientId::ALL.len());

        for client in ClientId::ALL {
            if client.is_native() {
                clients.push(ClientStatus {
                    id: client.as_str(),
                    native: true,
                    state: ClientState::Manual,
                    ready_snapshot: None,
                    memory_mb: None,
                });
                continue;
            }

            if let Some(provider) = provider.as_ref() {
                let state = provider.status(client)?;
                let ready_snapshot = if state == ClientState::NotProvisioned {
                    false
                } else {
                    provider.has_ready(client).unwrap_or(false)
                };
                let memory_mb = if state == ClientState::NotProvisioned {
                    None
                } else {
                    provider.memory_mb(client).ok()
                };

                clients.push(ClientStatus {
                    id: client.as_str(),
                    native: false,
                    state,
                    ready_snapshot: Some(ready_snapshot),
                    memory_mb,
                });
            } else {
                clients.push(ClientStatus {
                    id: client.as_str(),
                    native: false,
                    state: ClientState::Error,
                    ready_snapshot: Some(false),
                    memory_mb: None,
                });
            }
        }

        Ok(RuntimeStatus {
            provider: provider.as_ref().map(|provider| provider.id()),
            clients,
        })
    }

    pub fn start(&self, count: usize) -> io::Result<Vec<ClientStatus>> {
        if !(1..=4).contains(&count) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "client count must be between 1 and 4",
            ));
        }

        let host = doctor();
        if count > host.max_recommended_clients {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "requested {count} clients but this host is recommended for at most {}",
                    host.max_recommended_clients
                ),
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider();
        let virtual_clients = count.saturating_sub(1);

        if virtual_clients > 0 && provider.is_none() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            ));
        }

        let provider_ref = provider.as_ref();
        let virtual_targets: Vec<ClientId> = ClientId::ALL
            .into_iter()
            .skip(1)
            .take(virtual_clients)
            .collect();

        let mut stopped_targets = Vec::new();
        if let Some(provider) = provider_ref {
            for client in &virtual_targets {
                match provider.status(*client)? {
                    ClientState::NotProvisioned => {
                        return Err(io::Error::new(
                            io::ErrorKind::NotFound,
                            format!("{} is not provisioned", client.as_str()),
                        ));
                    }
                    ClientState::Stopped => stopped_targets.push(*client),
                    ClientState::Running => {}
                    _ => {
                        return Err(io::Error::new(
                            io::ErrorKind::Other,
                            format!("{} is not in a startable state", client.as_str()),
                        ));
                    }
                }
            }
        }

        if let Some(provider) = provider_ref {
            let plan = plan_memory(
                available_memory_mb(&host),
                virtual_clients,
                stopped_targets.len(),
            )?;

            for client in &stopped_targets {
                provider.configure_memory(*client, plan.memory_per_stopped_vm_mb)?;
            }
        }

        let mut result = Vec::with_capacity(count);
        result.push(ClientStatus {
            id: ClientId::Mce01.as_str(),
            native: true,
            state: ClientState::Manual,
            ready_snapshot: None,
            memory_mb: None,
        });

        if let Some(provider) = provider_ref {
            for (index, client) in virtual_targets.into_iter().enumerate() {
                let state = provider.start(client)?;
                result.push(ClientStatus {
                    id: client.as_str(),
                    native: false,
                    state,
                    ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
                    memory_mb: provider.memory_mb(client).ok(),
                });

                if index + 1 < virtual_clients {
                    thread::sleep(Duration::from_secs(2));
                }
            }
        }

        Ok(result)
    }

    pub fn stop(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        let targets: Vec<ClientId> = match client {
            Some(client) => vec![client],
            None => ClientId::ALL
                .into_iter()
                .filter(|client| !client.is_native())
                .collect(),
        };

        let mut result = Vec::with_capacity(targets.len());
        for client in targets {
            if client.is_native() {
                result.push(ClientStatus {
                    id: client.as_str(),
                    native: true,
                    state: ClientState::Manual,
                    ready_snapshot: None,
                    memory_mb: None,
                });
                continue;
            }

            result.push(ClientStatus {
                id: client.as_str(),
                native: false,
                state: provider.stop(client)?,
                ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
                memory_mb: provider.memory_mb(client).ok(),
            });
        }

        Ok(result)
    }

    pub fn restart(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "native client cannot be VM-restarted",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state: provider.restart(client)?,
            ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
            memory_mb: provider.memory_mb(client).ok(),
        })
    }

    pub fn set_ready(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "native client does not use QA_READY snapshots",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state: provider.set_ready(client)?,
            ready_snapshot: Some(true),
            memory_mb: provider.memory_mb(client).ok(),
        })
    }

    pub fn reset(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "native client does not use VM clean-state reset",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        let memory_mb = provider.memory_mb(client)?;
        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state: provider.reset(client, memory_mb)?,
            ready_snapshot: Some(true),
            memory_mb: Some(memory_mb),
        })
    }

    pub fn open(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Ok(ClientStatus {
                id: client.as_str(),
                native: true,
                state: ClientState::Manual,
                ready_snapshot: None,
                memory_mb: None,
            });
        }

        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;

        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state: provider.open(client)?,
            ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
            memory_mb: provider.memory_mb(client).ok(),
        })
    }
}
