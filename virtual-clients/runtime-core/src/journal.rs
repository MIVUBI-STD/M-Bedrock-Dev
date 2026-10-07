use crate::{
    error::{ErrorCode, ErrorReport},
    paths::runtime_root,
    persistence::{read_text_recovering, reject_unsafe_existing_file, write_text_transactional},
};
use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::{
    fs::OpenOptions,
    io,
    time::{SystemTime, UNIX_EPOCH},
};

const HISTORY_LIMIT: usize = 200;
const HISTORY_SCHEMA: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OperationKind {
    StageUpdate,
    RegisterBase,
    OpenBaseFinalization,
    Provision,
    Reprovision,
    VerifyIdentities,
    Start,
    Suspend,
    Stop,
    Restart,
    SetReady,
    Reset,
    Open,
    LaunchMinecraft,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OperationOutcome {
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationRecord {
    pub schema: u32,
    pub timestamp_unix_ms: u64,
    pub operation: OperationKind,
    pub target: Option<String>,
    pub outcome: OperationOutcome,
    pub error_code: Option<ErrorCode>,
    pub retryable: bool,
}

fn timestamp_ms() -> io::Result<u64> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?
        .as_millis();
    u64::try_from(millis)
        .map_err(|_| io::Error::new(io::ErrorKind::Other, "system time is out of range"))
}

fn history_path() -> io::Result<std::path::PathBuf> {
    Ok(runtime_root()?.join("operation-history.json"))
}

pub fn read_operation_history() -> io::Result<Vec<OperationRecord>> {
    let path = history_path()?;
    if !path.is_file() {
        return Ok(Vec::new());
    }

    let raw = read_text_recovering(&path)?;
    serde_json::from_str(&raw).map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

pub(crate) fn record_operation<T>(
    operation: OperationKind,
    target: Option<String>,
    result: &io::Result<T>,
) {
    let Ok(root) = runtime_root() else {
        return;
    };
    if std::fs::create_dir_all(&root).is_err() {
        return;
    }
    let lock_path = root.join(".operation-history.lock");
    if reject_unsafe_existing_file(&lock_path).is_err() {
        return;
    }
    let Ok(lock) = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(lock_path)
    else {
        return;
    };
    if FileExt::try_lock_exclusive(&lock).is_err() {
        return;
    }

    let (outcome, error_code, retryable) = match result {
        Ok(_) => (OperationOutcome::Success, None, false),
        Err(error) => {
            let report = ErrorReport::from_io(error);
            (
                OperationOutcome::Failed,
                Some(report.code),
                report.retryable,
            )
        }
    };

    let Ok(timestamp_unix_ms) = timestamp_ms() else {
        return;
    };
    let Ok(path) = history_path() else {
        return;
    };

    let mut history = match read_operation_history() {
        Ok(history) => history,
        Err(error) if error.kind() == io::ErrorKind::NotFound => Vec::new(),
        Err(_) => return,
    };
    history.push(OperationRecord {
        schema: HISTORY_SCHEMA,
        timestamp_unix_ms,
        operation,
        target,
        outcome,
        error_code,
        retryable,
    });

    if history.len() > HISTORY_LIMIT {
        let remove = history.len() - HISTORY_LIMIT;
        history.drain(0..remove);
    }

    let Ok(json) = serde_json::to_string_pretty(&history) else {
        return;
    };
    let _ = write_text_transactional(&path, &format!("{json}\n"));
    let _ = FileExt::unlock(&lock);
}

#[cfg(test)]
mod tests {
    use super::{OperationKind, OperationOutcome, OperationRecord, HISTORY_LIMIT};

    #[test]
    fn history_contract_is_bounded_and_non_sensitive() {
        assert_eq!(HISTORY_LIMIT, 200);
        let record = OperationRecord {
            schema: 1,
            timestamp_unix_ms: 1,
            operation: OperationKind::Start,
            target: Some("count:3".into()),
            outcome: OperationOutcome::Success,
            error_code: None,
            retryable: false,
        };
        let json = serde_json::to_string(&record).unwrap();
        assert!(!json.contains("password"));
        assert!(!json.contains("token"));
        assert!(!json.contains("email"));
    }
}
