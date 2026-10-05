use crate::{
    client::ClientId,
    provider::{base_vmx_path, current_platform_provider},
};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorClient {
    pub id: &'static str,
    pub provisioned: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub platform: &'static str,
    pub provider: Option<&'static str>,
    pub base_vm_path: Option<String>,
    pub base_vm_present: bool,
    pub base_vm_stopped: Option<bool>,
    pub clients: Vec<DoctorClient>,
    pub ready_for_provisioning: bool,
}

pub fn doctor() -> DoctorReport {
    let provider = current_platform_provider();
    let base = base_vmx_path().ok();
    let base_vm_present = base.as_ref().is_some_and(|path| path.is_file());
    let base_vm_stopped = match (provider.as_ref(), base.as_ref()) {
        (Some(provider), Some(path)) if path.is_file() => provider.is_running_path(path).ok().map(|running| !running),
        _ => None,
    };

    let clients = ClientId::ALL
        .into_iter()
        .filter(|client| !client.is_native())
        .map(|client| {
            let provisioned = provider
                .as_ref()
                .and_then(|provider| provider.status(client).ok())
                .is_some_and(|state| state != crate::client::ClientState::NotProvisioned);
            DoctorClient {
                id: client.as_str(),
                provisioned,
            }
        })
        .collect();

    DoctorReport {
        platform: std::env::consts::OS,
        provider: provider.as_ref().map(|provider| provider.id()),
        base_vm_path: base.map(|path| path.display().to_string()),
        base_vm_present,
        base_vm_stopped,
        clients,
        ready_for_provisioning: provider.is_some()
            && base_vm_present
            && base_vm_stopped == Some(true),
    }
}
