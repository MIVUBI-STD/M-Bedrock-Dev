use crate::{
    diagnostics::DiagnosticsReport,
    doctor::DoctorReport,
    journal::{read_operation_history, OperationRecord},
    paths::runtime_root,
    persistence::write_text_transactional,
};
use serde::Serialize;
use std::{
    fs, io,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineSnapshot {
    pub captured_at_unix_ms: u64,
    pub doctor: DoctorReport,
    pub diagnostics: DiagnosticsReport,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupportPrivacy {
    pub contains_credentials: bool,
    pub contains_account_identifiers: bool,
    pub contains_tokens: bool,
    pub contains_world_content: bool,
    pub contains_absolute_runtime_paths: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupportBundle {
    pub schema: u32,
    pub app_version: &'static str,
    pub privacy: SupportPrivacy,
    pub snapshot: EngineSnapshot,
    pub operation_history: Vec<OperationRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupportBundleResult {
    pub captured_at_unix_ms: u64,
    pub path: String,
}

pub(crate) fn capture_time_ms() -> io::Result<u64> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?
        .as_millis();
    u64::try_from(millis)
        .map_err(|_| io::Error::new(io::ErrorKind::Other, "system time is out of range"))
}

pub(crate) fn write_support_bundle(
    snapshot: EngineSnapshot,
) -> io::Result<SupportBundleResult> {
    let root = runtime_root()?.join("support");
    fs::create_dir_all(&root)?;

    let captured_at_unix_ms = snapshot.captured_at_unix_ms;
    let path = root.join(format!(
        "support-{}-{}.json",
        captured_at_unix_ms,
        std::process::id()
    ));

    let bundle = SupportBundle {
        schema: 1,
        app_version: env!("CARGO_PKG_VERSION"),
        privacy: SupportPrivacy {
            contains_credentials: false,
            contains_account_identifiers: false,
            contains_tokens: false,
            contains_world_content: false,
            contains_absolute_runtime_paths: false,
        },
        snapshot,
        operation_history: read_operation_history().unwrap_or_default(),
    };
    let json = serde_json::to_string_pretty(&bundle)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    write_text_transactional(&path, &format!("{json}\n"))?;

    Ok(SupportBundleResult {
        captured_at_unix_ms,
        path: path.display().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::SupportPrivacy;

    #[test]
    fn support_privacy_contract_excludes_sensitive_content() {
        let privacy = SupportPrivacy {
            contains_credentials: false,
            contains_account_identifiers: false,
            contains_tokens: false,
            contains_world_content: false,
            contains_absolute_runtime_paths: false,
        };

        assert!(!privacy.contains_credentials);
        assert!(!privacy.contains_account_identifiers);
        assert!(!privacy.contains_tokens);
        assert!(!privacy.contains_world_content);
        assert!(!privacy.contains_absolute_runtime_paths);
    }
}
