use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{io, path::PathBuf, process::Command};

use crate::{
    client::ClientId,
    guest::{guest_agent_launch_compatible, GUEST_AGENT_PROTOCOL_VERSION, GUEST_STATUS_SCHEMA},
    paths::{
        base_profile_path_for_version, base_vmx_path_for_version, client_profile_path,
        validate_version_segment,
    },
    persistence::{read_text_recovering, write_text_transactional},
};

pub const BASE_PROFILE_SCHEMA: u32 = 3;
pub const CLIENT_PROFILE_SCHEMA: u32 = 2;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MinecraftInstallType {
    Desktop,
    Store,
    AppBundle,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftProfile {
    pub version: String,
    pub install_type: MinecraftInstallType,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BaseState {
    Registered,
    Finalizing,
    Finalized,
}

impl BaseState {
    pub(crate) fn as_vmx_str(self) -> &'static str {
        match self {
            Self::Registered => "REGISTERED",
            Self::Finalizing => "FINALIZING",
            Self::Finalized => "FINALIZED",
        }
    }

    pub(crate) fn from_vmx_str(value: &str) -> io::Result<Self> {
        match value {
            "REGISTERED" => Ok(Self::Registered),
            "FINALIZING" => Ok(Self::Finalizing),
            "FINALIZED" => Ok(Self::Finalized),
            _ => Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("invalid Base lifecycle state: {value}"),
            )),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BaseProfileSource {
    LiveVerified,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseProfile {
    pub schema: u32,
    pub minecraft_version: String,
    pub native_install_type: MinecraftInstallType,
    pub guest_status_schema: u32,
    #[serde(default)]
    pub guest_agent_protocol: u32,
    pub guest_agent_version: String,
    #[serde(default)]
    pub base_generation_id: String,
    pub source: BaseProfileSource,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientProfile {
    pub schema: u32,
    pub base_minecraft_version: String,
    #[serde(default)]
    pub base_generation_id: String,
    pub created_by: String,
    #[serde(default)]
    pub verified_vm_identity: Option<String>,
    #[serde(default)]
    pub verified_windows_identity: Option<String>,
}


pub(crate) fn identity_fingerprint(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}

fn new_base_generation_id() -> io::Result<String> {
    let mut bytes = [0_u8; 32];
    getrandom::getrandom(&mut bytes)
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error.to_string()))?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn valid_provenance_id(value: &str) -> bool {
    value.len() == 64 && value.chars().all(|character| character.is_ascii_hexdigit())
}

impl ClientProfile {
    pub(crate) fn saved_vm_identity_matches(&self, current: Option<&str>) -> bool {
        match self.verified_vm_identity.as_deref() {
            None => true,
            Some(expected) => current.is_some_and(|value| identity_fingerprint(value) == expected),
        }
    }

    pub(crate) fn identity_provenance_matches(&self, current: Option<&str>) -> bool {
        self.verified_vm_identity.as_deref().is_some_and(|value| !value.is_empty())
            && self.verified_windows_identity.as_deref().is_some_and(|value| !value.is_empty())
            && self.saved_vm_identity_matches(current)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProfileParity {
    Match,
    Mismatch,
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatus {
    pub native: Option<MinecraftProfile>,
    pub base: Option<BaseProfile>,
    pub parity: ProfileParity,
}

pub fn current_base_vmx_path() -> io::Result<PathBuf> {
    let native = native_minecraft_profile().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Native Minecraft Education version could not be detected",
        )
    })?;
    base_vmx_path_for_version(&native.version)
}

pub fn base_profile_path() -> io::Result<PathBuf> {
    let native = native_minecraft_profile().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Native Minecraft Education version could not be detected",
        )
    })?;
    base_profile_path_for_version(&native.version)
}

pub fn load_base_profile() -> io::Result<BaseProfile> {
    let path = base_profile_path()?;
    let raw = read_text_recovering(&path)?;
    let profile: BaseProfile = serde_json::from_str(&raw).map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("invalid Base profile {}: {error}", path.display()),
        )
    })?;

    if profile.schema != BASE_PROFILE_SCHEMA {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "unsupported Base profile schema {}; expected {}",
                profile.schema, BASE_PROFILE_SCHEMA
            ),
        ));
    }
    if !valid_provenance_id(&profile.base_generation_id) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Base profile baseGenerationId is invalid",
        ));
    }

    Ok(profile)
}

pub fn write_verified_base_profile(
    native: &MinecraftProfile,
    guest_agent_version: &str,
    guest_agent_protocol: u32,
) -> io::Result<BaseProfile> {
    let base = base_vmx_path_for_version(&native.version)?;
    if !base.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("Base VM is missing: {}", base.display()),
        ));
    }

    let profile = BaseProfile {
        schema: BASE_PROFILE_SCHEMA,
        minecraft_version: native.version.clone(),
        native_install_type: native.install_type.clone(),
        guest_status_schema: GUEST_STATUS_SCHEMA,
        guest_agent_protocol,
        guest_agent_version: guest_agent_version.to_string(),
        base_generation_id: new_base_generation_id()?,
        source: BaseProfileSource::LiveVerified,
    };

    let path = base_profile_path_for_version(&native.version)?;
    let json = serde_json::to_string_pretty(&profile)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    write_text_transactional(&path, &format!("{json}\n"))?;

    Ok(profile)
}

pub fn write_client_profile(
    client: ClientId,
    base_version: &str,
    base_generation_id: &str,
) -> io::Result<ClientProfile> {
    if client.is_native() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Native does not have Virtual lineage provenance",
        ));
    }

    let profile = ClientProfile {
        schema: CLIENT_PROFILE_SCHEMA,
        base_minecraft_version: base_version.to_string(),
        base_generation_id: base_generation_id.to_string(),
        created_by: env!("CARGO_PKG_VERSION").to_string(),
        verified_vm_identity: None,
        verified_windows_identity: None,
    };
    write_client_profile_data(client, &profile)?;
    Ok(profile)
}

fn write_client_profile_data(client: ClientId, profile: &ClientProfile) -> io::Result<()> {
    validate_client_profile_identities(profile)?;
    let path = client_profile_path(client.as_str())?;
    let json = serde_json::to_string_pretty(profile)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    write_text_transactional(&path, &format!("{json}\n"))
}

pub fn write_verified_client_identities(
    client: ClientId,
    vm_identity: &str,
    windows_identity: &str,
) -> io::Result<ClientProfile> {
    let mut profile = load_client_profile(client)?;
    profile.verified_vm_identity = Some(vm_identity.to_string());
    profile.verified_windows_identity = Some(windows_identity.to_string());
    write_client_profile_data(client, &profile)?;
    Ok(profile)
}

pub fn load_client_profile(client: ClientId) -> io::Result<ClientProfile> {
    let path = client_profile_path(client.as_str())?;
    let raw = read_text_recovering(&path)?;
    let profile: ClientProfile = serde_json::from_str(&raw).map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("invalid client profile {}: {error}", path.display()),
        )
    })?;
    if profile.schema != CLIENT_PROFILE_SCHEMA {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "unsupported client profile schema {}; expected {}",
                profile.schema, CLIENT_PROFILE_SCHEMA
            ),
        ));
    }

    validate_client_profile_identities(&profile)?;
    Ok(profile)
}

fn valid_identity_fingerprint(value: &str) -> bool {
    value.len() == 64 && value.chars().all(|character| character.is_ascii_hexdigit())
}

fn validate_client_profile_identities(profile: &ClientProfile) -> io::Result<()> {
    if !valid_provenance_id(&profile.base_generation_id) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "client profile baseGenerationId is invalid",
        ));
    }

    for (name, value) in [
        (
            "verifiedVmIdentity",
            profile.verified_vm_identity.as_deref(),
        ),
        (
            "verifiedWindowsIdentity",
            profile.verified_windows_identity.as_deref(),
        ),
    ] {
        if let Some(value) = value {
            if !valid_identity_fingerprint(value) {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("client profile {name} fingerprint is invalid"),
                ));
            }
        }
    }

    Ok(())
}

pub fn client_lineage_parity(
    native: Option<&MinecraftProfile>,
    base: Option<&BaseProfile>,
    client: Option<&ClientProfile>,
    provisioned: bool,
) -> ProfileParity {
    if !provisioned {
        return ProfileParity::Unknown;
    }

    match (native, base, client) {
        (Some(native), Some(base), Some(client))
            if native.version == base.minecraft_version
                && native.version == client.base_minecraft_version
                && base.base_generation_id == client.base_generation_id =>
        {
            ProfileParity::Match
        }
        (Some(_), Some(_), Some(_)) => ProfileParity::Mismatch,
        _ => ProfileParity::Unknown,
    }
}

pub fn require_client_matches_native(client: ClientId) -> io::Result<ClientProfile> {
    let native = native_minecraft_profile().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Native Minecraft Education version could not be detected",
        )
    })?;
    let profile = load_client_profile(client).map_err(|error| {
        io::Error::new(
            error.kind(),
            format!(
                "{} lineage cannot be proven: {error}. Reprovision this Virtual.",
                client.as_str()
            ),
        )
    })?;

    if profile.base_minecraft_version != native.version {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "{} was provisioned from Minecraft {} but Native is {}. Reprovision this Virtual.",
                client.as_str(),
                profile.base_minecraft_version,
                native.version
            ),
        ));
    }

    let base = load_base_profile().map_err(|error| {
        io::Error::new(
            error.kind(),
            format!("registered Base lineage cannot be proven: {error}"),
        )
    })?;
    if profile.base_generation_id != base.base_generation_id {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "{} belongs to an older Base generation. Reprovision this Virtual from the current Base.",
                client.as_str()
            ),
        ));
    }

    Ok(profile)
}

pub fn native_minecraft_profile() -> Option<MinecraftProfile> {
    #[cfg(target_os = "windows")]
    {
        return windows_native_profile();
    }

    #[cfg(target_os = "macos")]
    {
        return macos_native_profile();
    }

    #[allow(unreachable_code)]
    None
}

fn base_profile_matches_native(native: &MinecraftProfile, base: &BaseProfile) -> bool {
    native.version == base.minecraft_version
        && base.guest_status_schema == GUEST_STATUS_SCHEMA
        && guest_agent_launch_compatible(base.guest_agent_protocol)
        && valid_provenance_id(&base.base_generation_id)
}

pub fn profile_status() -> ProfileStatus {
    let native = native_minecraft_profile();
    let base = load_base_profile().ok();

    let parity = match (&native, &base) {
        (Some(native), Some(base)) if base_profile_matches_native(native, base) => {
            ProfileParity::Match
        }
        (Some(_), Some(_)) => ProfileParity::Mismatch,
        _ => ProfileParity::Unknown,
    };

    ProfileStatus {
        native,
        base,
        parity,
    }
}

pub fn require_base_matches_native() -> io::Result<ProfileStatus> {
    let status = profile_status();

    match status.parity {
        ProfileParity::Match => Ok(status),
        ProfileParity::Mismatch => {
            let native = status
                .native
                .as_ref()
                .map(|profile| profile.version.as_str())
                .unwrap_or("unknown");
            let base = status
                .base
                .as_ref()
                .map(|profile| profile.minecraft_version.as_str())
                .unwrap_or("unknown");
            Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "Minecraft Education version mismatch: Native={native}, Base={base}. Prepare and register a Base matching Native before starting Virtual clients."
                ),
            ))
        }
        ProfileParity::Unknown => Err(io::Error::new(
            io::ErrorKind::NotFound,
            "Minecraft Education parity cannot be proven. Native version and registered Base profile are both required.",
        )),
    }
}

#[cfg(target_os = "windows")]
fn windows_native_profile() -> Option<MinecraftProfile> {
    let registry = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Microsoft Studios\Minecraft Education Edition",
            "/v",
            "Version",
            "/reg:32",
        ])
        .output()
        .ok();

    if let Some(output) = registry.filter(|output| output.status.success()) {
        let text = String::from_utf8_lossy(&output.stdout);
        if let Some(version) = parse_registry_version(&text) {
            return Some(MinecraftProfile {
                version,
                install_type: MinecraftInstallType::Desktop,
            });
        }
    }

    let store = Command::new("powershell.exe")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-AppxPackage -Name Microsoft.MinecraftEducationEdition -ErrorAction SilentlyContinue | Sort-Object Version -Descending | Select-Object -First 1 -ExpandProperty Version).ToString()",
        ])
        .output()
        .ok();

    store
        .filter(|output| output.status.success())
        .and_then(|output| normalized_version(&String::from_utf8_lossy(&output.stdout)))
        .map(|version| MinecraftProfile {
            version,
            install_type: MinecraftInstallType::Store,
        })
}

#[cfg(target_os = "windows")]
fn parse_registry_version(output: &str) -> Option<String> {
    output.lines().find_map(|line| {
        let line = line.trim();
        if !line.starts_with("Version") {
            return None;
        }
        line.split_whitespace().last().and_then(normalized_version)
    })
}

#[cfg(target_os = "macos")]
fn macos_native_profile() -> Option<MinecraftProfile> {
    let output = Command::new("plutil")
        .args([
            "-extract",
            "CFBundleShortVersionString",
            "raw",
            "-o",
            "-",
            "/Applications/Minecraft Education.app/Contents/Info.plist",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    normalized_version(&String::from_utf8_lossy(&output.stdout)).map(|version| MinecraftProfile {
        version,
        install_type: MinecraftInstallType::AppBundle,
    })
}

fn normalized_version(value: &str) -> Option<String> {
    let value = value.trim();
    validate_version_segment(value).ok()?;
    Some(value.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        base_profile_matches_native, normalized_version, BaseProfile, BaseProfileSource, BaseState,
        ClientProfile, MinecraftInstallType, MinecraftProfile, BASE_PROFILE_SCHEMA,
        CLIENT_PROFILE_SCHEMA,
    };
    use crate::guest::{GUEST_AGENT_PROTOCOL_VERSION, GUEST_STATUS_SCHEMA};

    #[test]
    fn version_normalization_is_strict() {
        assert_eq!(
            normalized_version("1.21.120.0\n"),
            Some("1.21.120.0".into())
        );
        assert_eq!(normalized_version(""), None);
        assert_eq!(normalized_version(".."), None);
        assert_eq!(normalized_version("1..21"), None);
        assert_eq!(normalized_version("version 1.21"), None);
    }

    #[test]
    fn base_state_vmx_contract_is_exact() {
        assert_eq!(BaseState::Registered.as_vmx_str(), "REGISTERED");
        assert_eq!(BaseState::Finalizing.as_vmx_str(), "FINALIZING");
        assert_eq!(BaseState::Finalized.as_vmx_str(), "FINALIZED");
        assert_eq!(
            BaseState::from_vmx_str("FINALIZED").unwrap(),
            BaseState::Finalized
        );
        assert_eq!(
            BaseState::from_vmx_str("READY").unwrap_err().kind(),
            std::io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn base_profile_schema_round_trips() {
        let profile = BaseProfile {
            schema: BASE_PROFILE_SCHEMA,
            minecraft_version: "1.21.120.0".into(),
            native_install_type: MinecraftInstallType::Desktop,
            guest_status_schema: GUEST_STATUS_SCHEMA,
            guest_agent_protocol: GUEST_AGENT_PROTOCOL_VERSION,
            guest_agent_version: "0.1.0".into(),
            base_generation_id: "a".repeat(64),
            source: BaseProfileSource::LiveVerified,
        };

        let json = serde_json::to_string(&profile).unwrap();
        let decoded: BaseProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, profile);
    }

    #[test]
    fn legacy_client_profile_without_base_generation_is_rejected() {
        let json = r#"{"schema":1,"baseMinecraftVersion":"1.21.120.0","createdBy":"0.1.0"}"#;
        let profile: ClientProfile = serde_json::from_str(json).unwrap();
        assert_ne!(profile.schema, CLIENT_PROFILE_SCHEMA);
        assert!(profile.base_generation_id.is_empty());
    }

    #[test]
    fn client_profile_identity_fingerprints_are_strict() {
        let mut profile = ClientProfile {
            schema: CLIENT_PROFILE_SCHEMA,
            base_minecraft_version: "1.21.120.0".into(),
            base_generation_id: "c".repeat(64),
            created_by: "0.1.0".into(),
            verified_vm_identity: Some("a".repeat(64)),
            verified_windows_identity: Some("b".repeat(64)),
        };
        super::validate_client_profile_identities(&profile).unwrap();

        profile.verified_windows_identity = Some("short".into());
        assert_eq!(
            super::validate_client_profile_identities(&profile)
                .unwrap_err()
                .kind(),
            std::io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn base_profile_parity_requires_current_agent_and_schema() {
        let native = MinecraftProfile {
            version: "1.21.120.0".into(),
            install_type: MinecraftInstallType::Desktop,
        };
        let current = BaseProfile {
            schema: BASE_PROFILE_SCHEMA,
            minecraft_version: native.version.clone(),
            native_install_type: MinecraftInstallType::Desktop,
            guest_status_schema: GUEST_STATUS_SCHEMA,
            guest_agent_protocol: GUEST_AGENT_PROTOCOL_VERSION,
            guest_agent_version: "older-compatible-package".into(),
            base_generation_id: "a".repeat(64),
            source: BaseProfileSource::LiveVerified,
        };

        assert!(base_profile_matches_native(&native, &current));

        let different_package_version = BaseProfile {
            guest_agent_version: "newer-compatible-package".into(),
            ..current.clone()
        };
        assert!(base_profile_matches_native(&native, &different_package_version));

        let stale_protocol = BaseProfile {
            guest_agent_protocol: GUEST_AGENT_PROTOCOL_VERSION + 1,
            ..current.clone()
        };
        assert!(!base_profile_matches_native(&native, &stale_protocol));

        let stale_schema = BaseProfile {
            guest_status_schema: GUEST_STATUS_SCHEMA + 1,
            ..current.clone()
        };
        assert!(!base_profile_matches_native(&native, &stale_schema));

        let wrong_version = BaseProfile {
            minecraft_version: "9.9.9".into(),
            ..current
        };
        assert!(!base_profile_matches_native(&native, &wrong_version));
    }

    #[test]
    fn native_profile_carries_install_type() {
        let profile = MinecraftProfile {
            version: "1.21.120.0".into(),
            install_type: MinecraftInstallType::Desktop,
        };
        assert_eq!(profile.version, "1.21.120.0");
    }
    #[test]
    fn stored_identity_provenance_requires_the_current_vm() {
        let mut profile = super::ClientProfile {
            schema: super::CLIENT_PROFILE_SCHEMA,
            base_minecraft_version: "1.0.0".into(),
            base_generation_id: "c".repeat(64),
            created_by: "test".into(),
            verified_vm_identity: Some(super::identity_fingerprint("uuid-a|mac-a")),
            verified_windows_identity: Some("windows-proof".into()),
        };
        assert!(profile.identity_provenance_matches(Some("uuid-a|mac-a")));
        assert!(!profile.identity_provenance_matches(Some("uuid-b|mac-a")));
        assert!(!profile.identity_provenance_matches(None));
        profile.verified_windows_identity = None;
        assert!(!profile.identity_provenance_matches(Some("uuid-a|mac-a")));
        profile.verified_windows_identity = Some(String::new());
        assert!(!profile.identity_provenance_matches(Some("uuid-a|mac-a")));
    }

    #[test]
    fn a_fresh_profile_is_not_identity_proof_but_has_no_saved_vm_mismatch() {
        let profile = super::ClientProfile {
            schema: super::CLIENT_PROFILE_SCHEMA,
            base_minecraft_version: "1.0.0".into(),
            base_generation_id: "c".repeat(64),
            created_by: "test".into(),
            verified_vm_identity: None,
            verified_windows_identity: None,
        };
        assert!(profile.saved_vm_identity_matches(None));
        assert!(!profile.identity_provenance_matches(Some("uuid-a|mac-a")));
        assert_eq!(super::identity_fingerprint("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

}
