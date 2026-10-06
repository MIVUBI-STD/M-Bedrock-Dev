use crate::{
    client::{ClientId, ClientState},
    paths::runtime_root,
    profile::current_base_vmx_path,
    profile::{load_client_profile, profile_status, ProfileParity, ProfileStatus},
    provider::current_platform_provider,
    schema::{inspect_runtime_schema, SchemaStatus},
};
use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorClient {
    pub id: &'static str,
    pub provisioned: bool,
    pub ready_snapshot: bool,
    pub lineage_parity: ProfileParity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SetupAction {
    RuntimeDataIncompatible,
    InstallProvider,
    InstallNativeMinecraft,
    PrepareBase,
    RegisterBase,
    ProvisionVirtuals,
    ReprovisionVirtuals,
    Ready,
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
    pub runtime_schema: SchemaStatus,
    pub runtime_profile: ProfileStatus,
    pub clients: Vec<DoctorClient>,
    pub ready_for_provisioning: bool,
    pub next_setup_action: SetupAction,
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
    let base = current_base_vmx_path().ok();

    let mut system = System::new();
    system.refresh_memory();
    system.refresh_cpu();
    let logical_cpus = system.cpus().len();
    let total_memory_gb = system.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let available_memory_gb = system.available_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let max_recommended_virtual_clients =
        recommended_by_memory(total_memory_gb).min(recommended_by_cpu(logical_cpus));

    let base_vm_present = base.as_ref().is_some_and(|path| path.is_file());
    let base_vm_stopped = match (provider.as_ref(), base.as_ref()) {
        (Some(provider), Some(path)) if path.is_file() => {
            provider.is_running_path(path).ok().map(|running| !running)
        }
        _ => None,
    };

    let runtime_schema = runtime_root()
        .map(|root| inspect_runtime_schema(&root))
        .unwrap_or_else(|_| SchemaStatus {
            state: crate::schema::SchemaState::Invalid,
            schema: None,
        });
    let runtime_profile = profile_status();

    let clients: Vec<DoctorClient> = ClientId::VIRTUAL
        .into_iter()
        .map(|client| {
            let state = provider
                .as_ref()
                .and_then(|provider| provider.status(client).ok());
            let provisioned = state.is_some_and(|state| state != ClientState::NotProvisioned);
            let ready_snapshot = if provisioned {
                provider
                    .as_ref()
                    .and_then(|provider| provider.has_ready(client).ok())
                    .unwrap_or(false)
            } else {
                false
            };

            let lineage_parity = match (
                runtime_profile.native.as_ref(),
                provisioned.then(|| load_client_profile(client).ok()).flatten(),
            ) {
                (Some(native), Some(profile))
                    if native.version == profile.base_minecraft_version =>
                {
                    ProfileParity::Match
                }
                (Some(_), Some(_)) => ProfileParity::Mismatch,
                _ => ProfileParity::Unknown,
            };

            DoctorClient {
                id: client.as_str(),
                provisioned,
                ready_snapshot,
                lineage_parity,
            }
        })
        .collect();

    let next_setup_action = if matches!(
        runtime_schema.state,
        crate::schema::SchemaState::Invalid | crate::schema::SchemaState::NewerThanApp
    ) {
        SetupAction::RuntimeDataIncompatible
    } else if provider.is_none() {
        SetupAction::InstallProvider
    } else if runtime_profile.native.is_none() {
        SetupAction::InstallNativeMinecraft
    } else if !base_vm_present {
        SetupAction::PrepareBase
    } else if runtime_profile.parity != ProfileParity::Match {
        SetupAction::RegisterBase
    } else if clients.iter().any(|client| !client.provisioned) {
        SetupAction::ProvisionVirtuals
    } else if clients
        .iter()
        .any(|client| client.lineage_parity != ProfileParity::Match)
    {
        SetupAction::ReprovisionVirtuals
    } else {
        SetupAction::Ready
    };

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
        runtime_schema,
        runtime_profile: runtime_profile.clone(),
        clients,
        ready_for_provisioning: provider.is_some()
            && base_vm_present
            && base_vm_stopped == Some(true)
            && runtime_profile.parity == ProfileParity::Match,
        next_setup_action,
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
