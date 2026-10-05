use crate::provider::current_platform_provider;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorReport {
    pub platform: &'static str,
    pub provider: Option<&'static str>,
    pub ready_for_provisioning: bool,
}

pub fn doctor() -> DoctorReport {
    let provider = current_platform_provider();
    DoctorReport {
        platform: std::env::consts::OS,
        provider: provider.as_ref().map(|provider| provider.id()),
        ready_for_provisioning: provider.is_some(),
    }
}
