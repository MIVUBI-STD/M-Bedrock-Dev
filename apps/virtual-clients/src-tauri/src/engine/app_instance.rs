use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use sysinfo::{Pid, System};

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;

const MAX_ACQUIRE_ATTEMPTS: u8 = 8;
const MAX_INSTANCE_MARKER_BYTES: u64 = 4096;
#[cfg(windows)]
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x00000400;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstanceMarker {
    process_id: u32,
    process_start_time: u64,
}

pub struct DesktopInstanceLease {
    path: PathBuf,
    marker: InstanceMarker,
}

pub fn acquire() -> Result<DesktopInstanceLease, String> {
    let path = instance_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not prepare Virtual Clients instance state: {error}"))?;
    }

    let marker = current_process_marker()?;
    for attempt in 0..MAX_ACQUIRE_ATTEMPTS {
        match try_create(&path, &marker) {
            Ok(()) => return Ok(DesktopInstanceLease { path, marker }),
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {
                if instance_owner_is_alive(&path)? {
                    return Err(
                        "M-Bedrock Virtual Clients is already running. Use the existing window instead of opening a second manager."
                            .into(),
                    );
                }

                let quarantine = stale_instance_path(&path, marker.process_id, attempt);
                let _ = fs::remove_file(&quarantine);
                match fs::rename(&path, &quarantine) {
                    Ok(()) => {
                        let _ = fs::remove_file(&quarantine);
                        continue;
                    }
                    Err(rename_error) if rename_error.kind() == ErrorKind::NotFound => continue,
                    Err(rename_error) => {
                        if instance_owner_is_alive(&path)? {
                            return Err(
                                "M-Bedrock Virtual Clients is already running. Use the existing window instead of opening a second manager."
                                    .into(),
                            );
                        }
                        return Err(format!(
                            "Could not retire stale Virtual Clients instance state: {rename_error}"
                        ));
                    }
                }
            }
            Err(error) => {
                return Err(format!(
                    "Could not acquire Virtual Clients instance authority: {error}"
                ))
            }
        }
    }

    Err("Could not acquire Virtual Clients instance authority after repeated concurrent changes. Close other Virtual Clients windows and try again.".into())
}

impl Drop for DesktopInstanceLease {
    fn drop(&mut self) {
        let Ok(Some(existing)) = read_instance_marker(&self.path) else {
            return;
        };
        if existing.process_id == self.marker.process_id
            && existing.process_start_time == self.marker.process_start_time
        {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn try_create(path: &Path, marker: &InstanceMarker) -> Result<(), std::io::Error> {
    let mut file = OpenOptions::new().create_new(true).write(true).open(path)?;
    let result = (|| {
        let text = serde_json::to_string(marker).map_err(std::io::Error::other)?;
        file.write_all(text.as_bytes())?;
        file.sync_all()
    })();
    if result.is_err() {
        drop(file);
        let _ = fs::remove_file(path);
    }
    result
}

fn current_process_marker() -> Result<InstanceMarker, String> {
    let process_id = std::process::id();
    let pid = Pid::from_u32(process_id);
    let mut system = System::new_all();
    system.refresh_process(pid);
    let process_start_time = system
        .process(pid)
        .map(|process| process.start_time())
        .ok_or_else(|| "Could not inspect the Virtual Clients process for single-instance coordination.".to_string())?;
    Ok(InstanceMarker {
        process_id,
        process_start_time,
    })
}

fn instance_owner_is_alive(path: &Path) -> Result<bool, String> {
    let Some(marker) = read_instance_marker(path)? else {
        return Ok(false);
    };
    let pid = Pid::from_u32(marker.process_id);
    let mut system = System::new_all();
    system.refresh_process(pid);
    Ok(system
        .process(pid)
        .map(|process| process.start_time() == marker.process_start_time)
        .unwrap_or(false))
}

fn read_instance_marker(path: &Path) -> Result<Option<InstanceMarker>, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Could not inspect Virtual Clients instance state: {error}")),
    };
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.file_type().is_file() {
        return Err("Virtual Clients refused unsafe desktop instance state.".into());
    }
    if metadata.len() > MAX_INSTANCE_MARKER_BYTES {
        return Err(format!(
            "Virtual Clients instance state exceeds the {MAX_INSTANCE_MARKER_BYTES} byte limit."
        ));
    }
    let text = fs::read_to_string(path)
        .map_err(|error| format!("Could not read Virtual Clients instance state: {error}"))?;
    let marker = match serde_json::from_str::<InstanceMarker>(&text) {
        Ok(marker) => marker,
        Err(_) => return Ok(None),
    };
    Ok(Some(marker))
}

#[cfg(windows)]
fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

#[cfg(not(windows))]
fn is_reparse_point(_metadata: &fs::Metadata) -> bool {
    false
}

fn instance_path() -> Result<PathBuf, String> {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .ok_or_else(|| "Application data directory is unavailable.".to_string())?;
    Ok(base
        .join("M-Bedrock")
        .join("VirtualClients")
        .join("desktop-instance.json"))
}

fn stale_instance_path(path: &Path, process_id: u32, attempt: u8) -> PathBuf {
    let parent = path.parent().map(PathBuf::from).unwrap_or_default();
    parent.join(format!(
        "desktop-instance.stale.{process_id}.{attempt}.json"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn marker_round_trips() {
        let marker = InstanceMarker {
            process_id: 42,
            process_start_time: 1234,
        };
        let encoded = serde_json::to_string(&marker).expect("serialize marker");
        let decoded: InstanceMarker = serde_json::from_str(&encoded).expect("deserialize marker");
        assert_eq!(decoded.process_id, 42);
        assert_eq!(decoded.process_start_time, 1234);
    }

    #[test]
    fn oversized_marker_is_rejected_before_parse() {
        let directory = std::env::temp_dir().join(format!(
            "virtual-clients-instance-limit-{}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("desktop-instance.json");
        let file = fs::File::create(&path).unwrap();
        file.set_len(MAX_INSTANCE_MARKER_BYTES + 1).unwrap();

        assert!(read_instance_marker(&path).is_err());

        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn stale_quarantine_is_unique_per_attempt() {
        let path = Path::new("C:/Temp/M-Bedrock/VirtualClients/desktop-instance.json");
        assert_ne!(
            stale_instance_path(path, 42, 0),
            stale_instance_path(path, 42, 1)
        );
    }
}
