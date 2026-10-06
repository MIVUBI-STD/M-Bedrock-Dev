use serde::{Deserialize, Serialize};
use std::{io, process::Command};

use crate::{
    client::{ClientId, ClientState},
    provider::current_platform_provider,
    schema::{inspect_runtime_schema, SchemaState},
    paths::runtime_root,
};

const RELEASE_CHANNEL_JSON: &str = include_str!("../../distribution/release-channel.json");

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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UpdateState {
    UpToDate,
    UpdateAvailable,
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
    pub reason: Option<String>,
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
            reason: Some(format!(
                "release channel {} does not publish for {}",
                policy.platform,
                current_platform()
            )),
        });
    }

    let output = Command::new("curl")
        .args([
            "--silent",
            "--show-error",
            "--fail",
            "--location",
            "--max-time",
            "12",
            policy.manifest_endpoint.as_str(),
        ])
        .output();

    let output = match output {
        Ok(output) if output.status.success() => output,
        Ok(output) => {
            return Ok(UpdateCheck {
                state: UpdateState::Unavailable,
                current_version: env!("CARGO_PKG_VERSION"),
                latest_version: None,
                can_apply_now: false,
                self_update_enabled: policy.self_update_runtime_enabled,
                reason: Some(
                    String::from_utf8_lossy(&output.stderr)
                        .trim()
                        .chars()
                        .take(500)
                        .collect(),
                ),
            })
        }
        Err(error) => {
            return Ok(UpdateCheck {
                state: UpdateState::Unavailable,
                current_version: env!("CARGO_PKG_VERSION"),
                latest_version: None,
                can_apply_now: false,
                self_update_enabled: policy.self_update_runtime_enabled,
                reason: Some(format!("update check could not start: {error}")),
            })
        }
    };

    let manifest: UpdateManifest = serde_json::from_slice(&output.stdout)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    let latest = parse_version(&manifest.version)?;
    let current = parse_version(env!("CARGO_PKG_VERSION"))?;

    let state = if latest > current {
        UpdateState::UpdateAvailable
    } else {
        UpdateState::UpToDate
    };

    let readiness = update_apply_readiness();

    Ok(UpdateCheck {
        state,
        current_version: env!("CARGO_PKG_VERSION"),
        latest_version: Some(manifest.version),
        can_apply_now: readiness.ready,
        self_update_enabled: policy.self_update_runtime_enabled,
        reason: readiness.reason,
    })
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
