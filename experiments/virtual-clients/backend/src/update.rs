use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::{self, Read},
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use crate::{
    client::{ClientId, ClientState},
    paths::{runtime_root, update_staging_root},
    provider::current_platform_provider,
    schema::{inspect_runtime_schema, SchemaState},
};

const RELEASE_CHANNEL_JSON: &str = include_str!("../../distribution/release-channel.json");
const MAX_MANIFEST_BYTES: u64 = 128 * 1024;
const MAX_INSTALLER_BYTES: u64 = 512 * 1024 * 1024;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseChannel {
    schema: u32,
    channel: String,
    repository: String,
    release_tag_prefix: String,
    platform: String,
    manifest_asset: String,
    manifest_endpoint: String,
    check_mode: String,
    apply_gate: String,
    self_update_runtime_enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct UpdateManifest {
    version: String,
    platforms: BTreeMap<String, PlatformManifest>,
}

#[derive(Debug, Clone, Deserialize)]
struct PlatformManifest {
    signature: String,
    url: String,
    sha256: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UpdateState {
    UpToDate,
    UpdateAvailable,
    UpdateStaged,
    Unavailable,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    pub state: UpdateState,
    pub current_version: &'static str,
    pub latest_version: Option<String>,
    pub can_apply_now: bool,
    pub self_update_enabled: bool,
    pub staged_path: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedUpdate {
    pub version: String,
    pub platform: String,
    pub installer_path: String,
    pub sha256: String,
    pub signature: String,
}

pub fn check_update() -> io::Result<UpdateCheck> {
    let policy = release_channel()?;
    validate_policy(&policy)?;

    if policy.platform != current_platform() {
        return Ok(UpdateCheck {
            state: UpdateState::Unavailable,
            current_version: env!("CARGO_PKG_VERSION"),
            latest_version: None,
            can_apply_now: false,
            self_update_enabled: false,
            staged_path: None,
            reason: Some(format!(
                "release channel {} does not publish for {}",
                policy.platform,
                current_platform()
            )),
        });
    }

    let manifest = match fetch_manifest(&policy) {
        Ok(manifest) => manifest,
        Err(error) => {
            return Ok(UpdateCheck {
                state: UpdateState::Unavailable,
                current_version: env!("CARGO_PKG_VERSION"),
                latest_version: None,
                can_apply_now: false,
                self_update_enabled: policy.self_update_runtime_enabled,
                staged_path: staged_update()
                    .ok()
                    .flatten()
                    .map(|item| item.installer_path),
                reason: Some(error.to_string()),
            })
        }
    };

    let latest = parse_version(&manifest.version)?;
    let current = parse_version(env!("CARGO_PKG_VERSION"))?;
    let staged = staged_update().ok().flatten();
    let staged_matches = staged
        .as_ref()
        .is_some_and(|item| item.version == manifest.version);

    let state = if latest <= current {
        UpdateState::UpToDate
    } else if staged_matches {
        UpdateState::UpdateStaged
    } else {
        UpdateState::UpdateAvailable
    };

    let readiness = update_apply_readiness();

    Ok(UpdateCheck {
        state,
        current_version: env!("CARGO_PKG_VERSION"),
        latest_version: Some(manifest.version),
        can_apply_now: readiness.ready,
        self_update_enabled: policy.self_update_runtime_enabled,
        staged_path: staged
            .filter(|item| staged_matches && Path::new(&item.installer_path).is_file())
            .map(|item| item.installer_path),
        reason: readiness.reason,
    })
}

pub fn stage_update() -> io::Result<StagedUpdate> {
    let policy = release_channel()?;
    validate_policy(&policy)?;

    if policy.platform != current_platform() {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            format!("no update package is published for {}", current_platform()),
        ));
    }

    let manifest = fetch_manifest(&policy)?;
    let latest = parse_version(&manifest.version)?;
    let current = parse_version(env!("CARGO_PKG_VERSION"))?;
    if latest <= current {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "Virtual Clients is already up to date",
        ));
    }

    let platform = manifest.platforms.get(current_platform()).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            format!("manifest has no {} package", current_platform()),
        )
    })?;
    validate_platform_manifest(&policy, &manifest.version, platform)?;

    let version_root = update_staging_root()?.join(&manifest.version);
    fs::create_dir_all(&version_root)?;
    let installer_name = platform
        .url
        .rsplit('/')
        .next()
        .filter(|name| !name.is_empty() && !name.contains(['/', '\\']))
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "installer URL is invalid"))?;
    let final_path = version_root.join(installer_name);
    let temporary = final_path.with_extension("download");

    download_to(&platform.url, &temporary, MAX_INSTALLER_BYTES)?;
    let actual = sha256_file(&temporary)?;
    if !actual.eq_ignore_ascii_case(&platform.sha256) {
        let _ = fs::remove_file(&temporary);
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "update installer SHA-256 mismatch: expected {}, got {}",
                platform.sha256, actual
            ),
        ));
    }

    if final_path.exists() {
        fs::remove_file(&final_path)?;
    }
    fs::rename(&temporary, &final_path)?;

    let staged = StagedUpdate {
        version: manifest.version,
        platform: current_platform().to_string(),
        installer_path: final_path.display().to_string(),
        sha256: actual,
        signature: platform.signature.clone(),
    };
    write_staged_update(&staged)?;
    Ok(staged)
}

fn fetch_manifest(policy: &ReleaseChannel) -> io::Result<UpdateManifest> {
    let bytes = fetch_bytes(&policy.manifest_endpoint, MAX_MANIFEST_BYTES)?;
    serde_json::from_slice(&bytes).map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("invalid update manifest: {error}"),
        )
    })
}

fn fetch_bytes(url: &str, max_bytes: u64) -> io::Result<Vec<u8>> {
    if !url.starts_with("https://") {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "update URL must use HTTPS",
        ));
    }

    let tls = native_tls::TlsConnector::new().map_err(|error| {
        io::Error::new(
            io::ErrorKind::Other,
            format!("native TLS initialization failed: {error}"),
        )
    })?;
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(12))
        .tls_connector(Arc::new(tls))
        .build();
    let response = agent.get(url).call().map_err(|error| {
        io::Error::new(
            io::ErrorKind::Other,
            format!("update download failed: {error}"),
        )
    })?;

    let mut bytes = Vec::new();
    response
        .into_reader()
        .take(max_bytes + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > max_bytes {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "update payload exceeded the allowed size",
        ));
    }
    Ok(bytes)
}

fn download_to(url: &str, path: &Path, max_bytes: u64) -> io::Result<()> {
    let bytes = fetch_bytes(url, max_bytes)?;
    fs::write(path, bytes)
}

fn sha256_file(path: &Path) -> io::Result<String> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn staged_metadata_path() -> io::Result<PathBuf> {
    Ok(update_staging_root()?.join("staged-update.json"))
}

fn staged_update() -> io::Result<Option<StagedUpdate>> {
    let path = staged_metadata_path()?;
    if !path.is_file() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path)?;
    let staged = serde_json::from_str(&raw)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    Ok(Some(staged))
}

fn write_staged_update(staged: &StagedUpdate) -> io::Result<()> {
    let root = update_staging_root()?;
    fs::create_dir_all(&root)?;
    let path = staged_metadata_path()?;
    let temporary = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(staged)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(&temporary, format!("{json}\n"))?;
    fs::rename(temporary, path)
}

fn validate_platform_manifest(
    policy: &ReleaseChannel,
    version: &str,
    platform: &PlatformManifest,
) -> io::Result<()> {
    parse_version(version)?;

    let expected_prefix = format!(
        "https://github.com/{}/releases/download/{}{}",
        policy.repository, policy.release_tag_prefix, version
    );
    if !platform.url.starts_with(&expected_prefix) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "update package URL does not match the configured release channel",
        ));
    }

    if platform.signature.trim().is_empty() || platform.signature.len() > 16_384 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "update signature metadata is invalid",
        ));
    }

    if platform.sha256.len() != 64
        || !platform
            .sha256
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "update SHA-256 metadata is invalid",
        ));
    }

    Ok(())
}

#[derive(Debug)]
struct ApplyReadiness {
    ready: bool,
    reason: Option<String>,
}

fn update_apply_readiness() -> ApplyReadiness {
    let Ok(root) = runtime_root() else {
        return ApplyReadiness {
            ready: false,
            reason: Some("runtime root is unavailable".into()),
        };
    };

    let schema = inspect_runtime_schema(&root);
    if schema.state != SchemaState::Ready && schema.state != SchemaState::Missing {
        return ApplyReadiness {
            ready: false,
            reason: Some(format!("runtime schema is {:?}", schema.state)),
        };
    }

    let Some(provider) = current_platform_provider() else {
        return ApplyReadiness {
            ready: true,
            reason: None,
        };
    };

    for client in ClientId::VIRTUAL {
        match provider.status(client) {
            Ok(ClientState::Stopped) | Ok(ClientState::NotProvisioned) => {}
            Ok(state) => {
                return ApplyReadiness {
                    ready: false,
                    reason: Some(format!("{} is {:?}", client.as_str(), state)),
                }
            }
            Err(error) => {
                return ApplyReadiness {
                    ready: false,
                    reason: Some(format!(
                        "{} state could not be read: {error}",
                        client.as_str()
                    )),
                }
            }
        }
    }

    ApplyReadiness {
        ready: true,
        reason: None,
    }
}

fn release_channel() -> io::Result<ReleaseChannel> {
    serde_json::from_str(RELEASE_CHANNEL_JSON)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

fn validate_policy(policy: &ReleaseChannel) -> io::Result<()> {
    if policy.schema != 1
        || policy.channel != "stable"
        || policy.repository != "MIVUBI-STD/M-Bedrock-Dev"
        || policy.release_tag_prefix != "virtual-clients-v"
        || policy.manifest_asset != "latest.json"
        || policy.check_mode != "startup-once"
        || policy.apply_gate != "all-virtuals-stopped"
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "release-channel policy is invalid",
        ));
    }

    Ok(())
}

fn current_platform() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        return "windows-x86_64";
    }

    #[cfg(target_os = "macos")]
    {
        return "macos";
    }

    #[allow(unreachable_code)]
    "unsupported"
}

fn parse_version(value: &str) -> io::Result<(u64, u64, u64)> {
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() != 3 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("invalid semantic version: {value}"),
        ));
    }

    let major = parts[0]
        .parse()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid major version"))?;
    let minor = parts[1]
        .parse()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid minor version"))?;
    let patch = parts[2]
        .parse()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid patch version"))?;
    Ok((major, minor, patch))
}

#[cfg(test)]
mod tests {
    use super::{parse_version, release_channel, validate_policy};

    #[test]
    fn release_channel_is_valid() {
        let policy = release_channel().unwrap();
        validate_policy(&policy).unwrap();
        assert!(!policy.self_update_runtime_enabled);
    }

    #[test]
    fn semantic_version_order_is_numeric() {
        assert!(parse_version("0.10.0").unwrap() > parse_version("0.9.9").unwrap());
        assert!(parse_version("1.0.0").unwrap() > parse_version("0.99.99").unwrap());
    }
}
