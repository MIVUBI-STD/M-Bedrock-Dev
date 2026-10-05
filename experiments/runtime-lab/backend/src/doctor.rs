use crate::provider::{base_vmx_path, current_platform_provider};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub platform: &'static str,
    pub provider: Option<&'static str>,
    pub base_vm_path: Option<String>,
    pub base_vm_present: bool,
    pub ready_for_provisioning: bool,
}

pub fn doctor() -> DoctorReport {
    let provider = current_platform_provider();
    let base = base_vmx_path().ok();
    let base_vm_present = base.as_ref().is_some_and(|path| path.is_file());

    DoctorReport {
        platform: std::env::consts::OS,
        provider: provider.as_ref().map(|provider| provider.id()),
        base_vm_path: base.map(|path| path.display().to_string()),
        base_vm_present,
        ready_for_provisioning: provider.is_some() && base_vm_present,
    }
}
