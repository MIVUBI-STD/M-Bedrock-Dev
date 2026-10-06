use serde::{Deserialize, Serialize};
use std::{fs, io, path::PathBuf, process::Command};

use crate::{
    client::ClientId,
    guest::GUEST_STATUS_SCHEMA,
    paths::{base_profile_path_for_version, base_vmx_path_for_version, client_profile_path},
};

pub const BASE_PROFILE_SCHEMA: u32 = 2;
pub const CLIENT_PROFILE_SCHEMA: u32 = 1;

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
    pub guest_agent_version: String,
    pub source: BaseProfileSource,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientProfile {
    pub schema: u32,
    pub base_minecraft_version: String,
    pub created_by: String,
    #[serde(default)]
    pub verified_vm_identity: Option<String>,
    #[serde(default)]
    pub verified_windows_identity: Option<String>,
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
    let raw = fs::read_to_string(&path)?;
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

    Ok(profile)
}

pub fn write_verified_base_profile(
    native: &MinecraftProfile,
    guest_agent_version: &str,
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
        guest_agent_version: guest_agent_version.to_string(),
        source: BaseProfileSource::LiveVerified,
    };

    let path = base_profile_path_for_version(&native.version)?;
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "Base profile path has no parent directory",
        )
    })?;
    fs::create_dir_all(parent)?;

    let temporary = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(&profile)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(&temporary, format!("{json}\n"))?;
    fs::rename(&temporary, &path)?;

    Ok(profile)
}

pub fn write_client_profile(client: ClientId, base_version: &str) -> io::Result<ClientProfile> {
    if client.is_native() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Native does not have Virtual lineage provenance",
        ));
    }

    let profile = ClientProfile {
        schema: CLIENT_PROFILE_SCHEMA,
        base_minecraft_version: base_version.to_string(),
        created_by: env!("CARGO_PKG_VERSION").to_string(),
        verified_vm_identity: None,
        verified_windows_identity: None,
    };
    write_client_profile_data(client, &profile)?;
    Ok(profile)
}

fn write_client_profile_data(client: ClientId, profile: &ClientProfile) -> io::Result<()> {
    let path = client_profile_path(client.as_str())?;
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "client profile path has no parent",
        )
    })?;
    fs::create_dir_all(parent)?;
    let temporary = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(profile)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(&temporary, format!("{json}\n"))?;
    fs::rename(temporary, path)
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
    let raw = fs::read_to_string(&path)?;
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
    Ok(profile)
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

pub fn profile_status() -> ProfileStatus {
    let native = native_minecraft_profile();
    let base = load_base_profile().ok();

    let parity = match (&native, &base) {
        (Some(native), Some(base))
            if native.version == base.minecraft_version
                && base.guest_status_schema == GUEST_STATUS_SCHEMA =>
        {
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
    if value.is_empty()
        || !value
            .chars()
            .all(|character| character.is_ascii_digit() || character == '.')
    {
        return None;
    }
    Some(value.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        normalized_version, BaseProfile, BaseProfileSource, MinecraftInstallType, MinecraftProfile,
        ClientProfile, BASE_PROFILE_SCHEMA, CLIENT_PROFILE_SCHEMA,
    };
    use crate::guest::GUEST_STATUS_SCHEMA;

    #[test]
    fn version_normalization_is_strict() {
        assert_eq!(
            normalized_version("1.21.120.0\n"),
            Some("1.21.120.0".into())
        );
        assert_eq!(normalized_version(""), None);
        assert_eq!(normalized_version("version 1.21"), None);
    }

    #[test]
    fn base_profile_schema_round_trips() {
        let profile = BaseProfile {
            schema: BASE_PROFILE_SCHEMA,
            minecraft_version: "1.21.120.0".into(),
            native_install_type: MinecraftInstallType::Desktop,
            guest_status_schema: GUEST_STATUS_SCHEMA,
            guest_agent_version: "0.1.0".into(),
            source: BaseProfileSource::LiveVerified,
        };

        let json = serde_json::to_string(&profile).unwrap();
        let decoded: BaseProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, profile);
    }

    #[test]
    fn legacy_client_profile_without_identity_proof_is_compatible() {
        let json = r#"{"schema":1,"baseMinecraftVersion":"1.21.120.0","createdBy":"0.1.0"}"#;
        let profile: ClientProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.schema, CLIENT_PROFILE_SCHEMA);
        assert_eq!(profile.verified_vm_identity, None);
        assert_eq!(profile.verified_windows_identity, None);
    }

    #[test]
    fn native_profile_carries_install_type() {
        let profile = MinecraftProfile {
            version: "1.21.120.0".into(),
            install_type: MinecraftInstallType::Desktop,
        };
        assert_eq!(profile.version, "1.21.120.0");
    }
}
