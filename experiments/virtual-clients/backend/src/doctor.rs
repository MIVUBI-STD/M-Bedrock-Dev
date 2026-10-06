use crate::{
    client::{ClientId, ClientState},
    paths::runtime_root,
    profile::current_base_vmx_path,
    profile::{load_client_profile, profile_status, ProfileParity, ProfileStatus},
    provider::{base_state_for_path, current_platform_provider},
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
    pub identity_provenance: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SetupAction {
    RuntimeDataIncompatible,
    InstallProvider,
    InstallNativeMinecraft,
    PrepareBase,
    RegisterBase,
    FinalizeBase,
    RebuildBase,
    ProvisionVirtuals,
    ReprovisionVirtuals,
    VerifyIdentities,
    CreateReadySnapshots,
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
    pub base_vm_present: bool,
    pub base_vm_stopped: Option<bool>,
    pub base_state: Option<String>,
    pub runtime_schema: SchemaStatus,
    pub runtime_profile: ProfileStatus,
    pub clients: Vec<DoctorClient>,
    pub ready_for_provisioning: bool,
    pub next_setup_action: SetupAction,
}

fn schema_allows_provisioning(status: &SchemaStatus) -> bool {
    matches!(
        status.state,
        crate::schema::SchemaState::Ready | crate::schema::SchemaState::Missing
    )
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

fn select_setup_action(
    runtime_schema: &SchemaStatus,
    provider_available: bool,
    native_available: bool,
    base_vm_present: bool,
    profile_parity: ProfileParity,
    base_state: Option<&str>,
    clients: &[DoctorClient],
) -> SetupAction {
    if matches!(
        runtime_schema.state,
        crate::schema::SchemaState::Invalid | crate::schema::SchemaState::NewerThanApp
    ) {
        SetupAction::RuntimeDataIncompatible
    } else if !provider_available {
        SetupAction::InstallProvider
    } else if !native_available {
        SetupAction::InstallNativeMinecraft
    } else if !base_vm_present {
        SetupAction::PrepareBase
    } else if profile_parity != ProfileParity::Match {
        if matches!(base_state, Some("FINALIZED") | Some("FINALIZING")) {
            SetupAction::RebuildBase
        } else {
            SetupAction::RegisterBase
        }
    } else if base_state == Some("FINALIZING") {
        SetupAction::RebuildBase
    } else if base_state != Some("REGISTERED") && base_state != Some("FINALIZED") {
        SetupAction::RegisterBase
    } else if base_state == Some("REGISTERED") {
        SetupAction::FinalizeBase
    } else if clients.iter().any(|client| !client.provisioned) {
        SetupAction::ProvisionVirtuals
    } else if clients
        .iter()
        .any(|client| client.lineage_parity != ProfileParity::Match)
    {
        SetupAction::ReprovisionVirtuals
    } else if clients.iter().any(|client| !client.identity_provenance) {
        SetupAction::VerifyIdentities
    } else if clients.iter().any(|client| !client.ready_snapshot) {
        SetupAction::CreateReadySnapshots
    } else {
        SetupAction::Ready
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

    let base_state = base
        .as_ref()
        .and_then(|path| base_state_for_path(path).ok())
        .flatten();

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
                provisioned
                    .then(|| load_client_profile(client).ok())
                    .flatten(),
            ) {
                (Some(native), Some(profile))
                    if native.version == profile.base_minecraft_version =>
                {
                    ProfileParity::Match
                }
                (Some(_), Some(_)) => ProfileParity::Mismatch,
                _ => ProfileParity::Unknown,
            };

            let identity_provenance = load_client_profile(client).ok().is_some_and(|profile| {
                profile.verified_vm_identity.is_some()
                    && profile.verified_windows_identity.is_some()
            });

            DoctorClient {
                id: client.as_str(),
                provisioned,
                ready_snapshot,
                lineage_parity,
                identity_provenance,
            }
        })
        .collect();

    let next_setup_action = select_setup_action(
        &runtime_schema,
        provider.is_some(),
        runtime_profile.native.is_some(),
        base_vm_present,
        runtime_profile.parity,
        base_state.as_deref(),
        &clients,
    );

    let ready_for_provisioning = provider.is_some()
        && base_vm_present
        && base_vm_stopped == Some(true)
        && base_state.as_deref() == Some("FINALIZED")
        && runtime_profile.parity == ProfileParity::Match
        && schema_allows_provisioning(&runtime_schema);

    DoctorReport {
        platform: std::env::consts::OS,
        provider: provider.as_ref().map(|provider| provider.id()),
        logical_cpus,
        total_memory_gb,
        available_memory_gb,
        max_recommended_virtual_clients,
        base_vm_present,
        base_vm_stopped,
        base_state: base_state.clone(),
        runtime_schema,
        runtime_profile: runtime_profile.clone(),
        clients,
        ready_for_provisioning,
        next_setup_action,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        recommended_by_cpu, recommended_by_memory, schema_allows_provisioning, select_setup_action,
        DoctorClient, SetupAction,
    };
    use crate::{
        profile::ProfileParity,
        schema::{SchemaState, SchemaStatus},
    };

    fn compatible_schema() -> SchemaStatus {
        SchemaStatus {
            state: SchemaState::Ready,
            schema: Some(crate::schema::CURRENT_RUNTIME_SCHEMA),
        }
    }

    fn client(ready_snapshot: bool, identity_provenance: bool) -> DoctorClient {
        DoctorClient {
            id: "Virtual-test",
            provisioned: true,
            ready_snapshot,
            lineage_parity: ProfileParity::Match,
            identity_provenance,
        }
    }

    #[test]
    fn provisioning_readiness_fails_closed_on_incompatible_schema() {
        let ready = SchemaStatus {
            state: SchemaState::Ready,
            schema: Some(crate::schema::CURRENT_RUNTIME_SCHEMA),
        };
        let missing = SchemaStatus {
            state: SchemaState::Missing,
            schema: None,
        };
        let invalid = SchemaStatus {
            state: SchemaState::Invalid,
            schema: None,
        };
        let newer = SchemaStatus {
            state: SchemaState::NewerThanApp,
            schema: Some(crate::schema::CURRENT_RUNTIME_SCHEMA + 1),
        };

        assert!(schema_allows_provisioning(&ready));
        assert!(schema_allows_provisioning(&missing));
        assert!(!schema_allows_provisioning(&invalid));
        assert!(!schema_allows_provisioning(&newer));
    }

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

    #[test]
    fn identity_proof_precedes_ready_snapshot_setup() {
        let clients = vec![
            client(false, false),
            client(false, false),
            client(false, false),
        ];
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &clients,
            ),
            SetupAction::VerifyIdentities
        );

        let clients = vec![
            client(false, true),
            client(false, true),
            client(false, true),
        ];
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &clients,
            ),
            SetupAction::CreateReadySnapshots
        );
    }

    #[test]
    fn base_state_routes_legacy_and_interrupted_setup_safely() {
        let clients = vec![
            client(false, false),
            client(false, false),
            client(false, false),
        ];

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                None,
                &clients,
            ),
            SetupAction::RegisterBase
        );

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("REGISTERED"),
                &clients,
            ),
            SetupAction::FinalizeBase
        );

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZING"),
                &clients,
            ),
            SetupAction::RebuildBase
        );
    }

    #[test]
    fn stale_finalized_base_requires_rebuild_not_reregistration() {
        let clients = vec![
            client(false, false),
            client(false, false),
            client(false, false),
        ];

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Mismatch,
                Some("FINALIZED"),
                &clients,
            ),
            SetupAction::RebuildBase
        );
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Mismatch,
                Some("REGISTERED"),
                &clients,
            ),
            SetupAction::RegisterBase
        );
    }

    #[test]
    fn setup_action_precedence_is_deterministic() {
        let ready_clients = vec![client(true, true), client(true, true), client(true, true)];

        let invalid_schema = SchemaStatus {
            state: SchemaState::Invalid,
            schema: None,
        };
        assert_eq!(
            select_setup_action(
                &invalid_schema,
                false,
                false,
                false,
                ProfileParity::Unknown,
                None,
                &[],
            ),
            SetupAction::RuntimeDataIncompatible
        );

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                false,
                false,
                false,
                ProfileParity::Unknown,
                None,
                &[],
            ),
            SetupAction::InstallProvider
        );

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                false,
                false,
                ProfileParity::Unknown,
                None,
                &[],
            ),
            SetupAction::InstallNativeMinecraft
        );

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                false,
                ProfileParity::Unknown,
                None,
                &[],
            ),
            SetupAction::PrepareBase
        );

        let mut missing_virtual = ready_clients.clone();
        missing_virtual[1].provisioned = false;
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &missing_virtual,
            ),
            SetupAction::ProvisionVirtuals
        );

        let mut stale_lineage = ready_clients.clone();
        stale_lineage[2].lineage_parity = ProfileParity::Unknown;
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &stale_lineage,
            ),
            SetupAction::ReprovisionVirtuals
        );

        let mut no_identity = ready_clients.clone();
        no_identity[0].identity_provenance = false;
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &no_identity,
            ),
            SetupAction::VerifyIdentities
        );

        let mut no_ready = ready_clients.clone();
        no_ready[0].ready_snapshot = false;
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &no_ready,
            ),
            SetupAction::CreateReadySnapshots
        );

        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &ready_clients,
            ),
            SetupAction::Ready
        );
    }

    #[test]
    fn ready_requires_all_ready_snapshots() {
        let mut clients = vec![client(true, true), client(true, true), client(false, true)];
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &clients,
            ),
            SetupAction::CreateReadySnapshots
        );

        clients[2].ready_snapshot = true;
        assert_eq!(
            select_setup_action(
                &compatible_schema(),
                true,
                true,
                true,
                ProfileParity::Match,
                Some("FINALIZED"),
                &clients,
            ),
            SetupAction::Ready
        );
    }
}
