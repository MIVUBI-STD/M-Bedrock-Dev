use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::PathBuf,
    process::Command,
};

use crate::provider::base_vmx_path;

pub const BASE_PROFILE_SCHEMA: u32 = 1;

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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseProfile {
    pub schema: u32,
    pub minecraft: MinecraftProfile,
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

pub fn base_profile_path() -> io::Result<PathBuf> {
    let base = base_vmx_path()?;
    let parent = base.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidInput, "Base VMX has no parent directory")
    })?;
    Ok(parent.join("base-profile.json"))
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
        (Some(native), Some(base)) if native.version == base.minecraft.version => {
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
                .map(|profile| profile.minecraft.version.as_str())
                .unwrap_or("unknown");
            Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "Minecraft Education version mismatch: Native={native}, Base={base}. Prepare a Base matching Native before starting Virtual clients."
                ),
            ))
        }
        ProfileParity::Unknown => Err(io::Error::new(
            io::ErrorKind::NotFound,
            "Minecraft Education parity cannot be proven. Native version and Base profile are both required.",
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
            "(Get-AppxPackage *MinecraftEducation* | Sort-Object Version -Descending | Select-Object -First 1 -ExpandProperty Version).ToString()",
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
    use super::{normalized_version, BaseProfile, MinecraftInstallType, MinecraftProfile};

    #[test]
    fn version_normalization_is_strict() {
        assert_eq!(normalized_version("1.21.120.0\n"), Some("1.21.120.0".into()));
        assert_eq!(normalized_version(""), None);
        assert_eq!(normalized_version("version 1.21"), None);
    }

    #[test]
    fn base_profile_schema_round_trips() {
        let profile = BaseProfile {
            schema: 1,
            minecraft: MinecraftProfile {
                version: "1.21.120.0".into(),
                install_type: MinecraftInstallType::Desktop,
            },
        };

        let json = serde_json::to_string(&profile).unwrap();
        let decoded: BaseProfile = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, profile);
    }
}
