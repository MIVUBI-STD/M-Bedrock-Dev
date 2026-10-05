use crate::{
    client::{ClientId, ClientState},
    provider::{base_vmx_path, current_platform_provider},
};
use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorClient {
    pub id: &'static str,
    pub provisioned: bool,
    pub ready_snapshot: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub platform: &'static str,
    pub provider: Option<&'static str>,
    pub logical_cpus: usize,
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub max_recommended_virtual_clients: usize,
    pub base_vm_path: Option<String>,
    pub base_vm_present: bool,
    pub base_vm_stopped: Option<bool>,
    pub clients: Vec<DoctorClient>,
    pub ready_for_provisioning: bool,
}

fn recommended_by_memory(total_gb: f64) -> usize {
    if total_gb >= 24.0 {
        3
    } else if total_gb >= 16.0 {
        2
    } else if total_gb >= 12.0 {
        1
    } else {
        0
    }
}

fn recommended_by_cpu(logical_cpus: usize) -> usize {
    if logical_cpus >= 8 {
        3
    } else if logical_cpus >= 6 {
        2
    } else if logical_cpus >= 4 {
        1
    } else {
        0
    }
}

pub fn doctor() -> DoctorReport {
    let provider = current_platform_provider();
    let base = base_vmx_path().ok();

    let mut system = System::new();
    system.refresh_memory();
    system.refresh_cpu();
    let logical_cpus = system.cpus().len();
    let total_memory_gb = system.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let available_memory_gb = system.available_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let max_recommended_virtual_clients = recommended_by_memory(total_memory_gb)
        .min(recommended_by_cpu(logical_cpus));

    let base_vm_present = base.as_ref().is_some_and(|path| path.is_file());
    let base_vm_stopped = match (provider.as_ref(), base.as_ref()) {
        (Some(provider), Some(path)) if path.is_file() => {
            provider.is_running_path(path).ok().map(|running| !running)
        }
        _ => None,
    };

    let clients = ClientId::VIRTUAL
        .into_iter()
        .map(|client| {
            let state = provider.as_ref().and_then(|provider| provider.status(client).ok());
            let provisioned = state.is_some_and(|state| state != ClientState::NotProvisioned);
            let ready_snapshot = if provisioned {
                provider
                    .as_ref()
                    .and_then(|provider| provider.has_ready(client).ok())
                    .unwrap_or(false)
            } else {
                false
            };

            DoctorClient {
                id: client.as_str(),
                provisioned,
                ready_snapshot,
            }
        })
        .collect();

    DoctorReport {
        platform: std::env::consts::OS,
        provider: provider.as_ref().map(|provider| provider.id()),
        logical_cpus,
        total_memory_gb,
        available_memory_gb,
        max_recommended_virtual_clients,
        base_vm_path: base.map(|path| path.display().to_string()),
        base_vm_present,
        base_vm_stopped,
        clients,
        ready_for_provisioning: provider.is_some()
            && base_vm_present
            && base_vm_stopped == Some(true),
    }
}

#[cfg(test)]
mod tests {
    use super::{recommended_by_cpu, recommended_by_memory};

    #[test]
    fn memory_capacity_is_bounded() {
        assert_eq!(recommended_by_memory(64.0), 3);
        assert_eq!(recommended_by_memory(24.0), 3);
        assert_eq!(recommended_by_memory(16.0), 2);
        assert_eq!(recommended_by_memory(12.0), 1);
        assert_eq!(recommended_by_memory(8.0), 0);
    }

    #[test]
    fn cpu_capacity_is_bounded() {
        assert_eq!(recommended_by_cpu(16), 3);
        assert_eq!(recommended_by_cpu(6), 2);
        assert_eq!(recommended_by_cpu(4), 1);
        assert_eq!(recommended_by_cpu(2), 0);
    }
}
