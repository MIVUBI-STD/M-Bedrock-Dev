use crate::{
    client::{ClientId, ClientState, ClientStatus},
    doctor::{doctor, DoctorReport},
    provider::current_platform_provider,
};
use serde::Serialize;
use std::io;

#[derive(Debug, Default)]
pub struct RuntimeLab;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub provider: Option<&'static str>,
    pub clients: Vec<ClientStatus>,
}

impl RuntimeLab {
    pub fn doctor(&self) -> DoctorReport {
        doctor()
    }

    pub fn status(&self) -> io::Result<RuntimeStatus> {
        let provider = current_platform_provider();
        let mut clients = Vec::with_capacity(ClientId::ALL.len());

        for client in ClientId::ALL {
            let state = if client.is_native() {
                ClientState::Manual
            } else if let Some(provider) = provider.as_ref() {
                provider.status(client)?
            } else {
                ClientState::Error
            };

            clients.push(ClientStatus {
                id: client.as_str(),
                native: client.is_native(),
                state,
            });
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

        let provider = current_platform_provider();
        if count > 1 && provider.is_none() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            ));
        }

        let mut result = Vec::with_capacity(count);
        for client in ClientId::ALL.into_iter().take(count) {
            let state = if client.is_native() {
                ClientState::Manual
            } else {
                provider
                    .as_ref()
                    .expect("provider checked above")
                    .start(client)?
            };

            result.push(ClientStatus {
                id: client.as_str(),
                native: client.is_native(),
                state,
            });
        }

        Ok(result)
    }

    pub fn stop(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
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
                });
                continue;
            }

            result.push(ClientStatus {
                id: client.as_str(),
                native: false,
                state: provider.stop(client)?,
            });
        }

        Ok(result)
    }

    pub fn reset(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "native client cannot be VM-reset",
            ));
        }
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;
        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state: provider.reset(client)?,
        })
    }

    pub fn open(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Ok(ClientStatus {
                id: client.as_str(),
                native: true,
                state: ClientState::Manual,
            });
        }
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;
        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state: provider.open(client)?,
        })
    }
}
