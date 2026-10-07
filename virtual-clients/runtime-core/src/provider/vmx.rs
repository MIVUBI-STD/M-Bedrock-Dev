use crate::{
    client::ClientId,
    policy::VIRTUAL_VCPUS,
    profile::BaseState,
    resources::VIRTUAL_MEMORY_LIMIT_MB,
};
use std::{fs, io, path::Path};

pub(crate) const GUEST_TOKEN_KEY: &str = "guestinfo.virtualclients.token";
pub(crate) const BASE_STATE_KEY: &str = "guestinfo.virtualclients.baseState";

pub(crate) fn apply_virtual_hardware_policy(vmx: &Path) -> io::Result<()> {
    let source = fs::read_to_string(vmx)?;
    let mut lines: Vec<String> = source.lines().map(ToOwned::to_owned).collect();
    set_vmx_value(&mut lines, "numvcpus", &VIRTUAL_VCPUS.to_string());
    set_vmx_value(&mut lines, "memsize", &VIRTUAL_MEMORY_LIMIT_MB.to_string());
    set_vmx_value(&mut lines, "mks.enable3d", "TRUE");
    set_vmx_value(&mut lines, "ethernet0.present", "TRUE");
    set_vmx_value(&mut lines, "ethernet0.startConnected", "TRUE");
    set_vmx_value(&mut lines, "answer.msg.uuid.altered", "I copied it");
    remove_vmx_value(&mut lines, BASE_STATE_KEY);
    let mut output = lines.join("\n");
    output.push('\n');
    fs::write(vmx, output)?;
    rotate_guest_token_for_path(vmx).map(|_| ())
}

pub(crate) fn read_vmx_value(vmx: &Path, key: &str) -> io::Result<Option<String>> {
    let source = fs::read_to_string(vmx)?;
    let prefix = format!("{key} =");
    Ok(source.lines().find_map(|line| {
        let trimmed = line.trim();
        trimmed.strip_prefix(&prefix).map(|value| value.trim().trim_matches('"').to_string())
    }))
}

pub(crate) fn read_vmx_memory(vmx: &Path) -> io::Result<u64> {
    read_vmx_value(vmx, "memsize")?
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "memsize is missing from VMX"))?
        .parse::<u64>()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid memsize in VMX"))
}

pub(crate) fn guest_token_for_path(vmx: &Path) -> io::Result<Option<String>> { read_vmx_value(vmx, GUEST_TOKEN_KEY) }

pub(crate) fn base_state_for_path(vmx: &Path) -> io::Result<Option<BaseState>> {
    read_vmx_value(vmx, BASE_STATE_KEY)?.map(|value| BaseState::from_vmx_str(&value)).transpose()
}

pub(crate) fn set_base_state_for_path(vmx: &Path, state: BaseState) -> io::Result<()> {
    let source = fs::read_to_string(vmx)?;
    let mut lines: Vec<String> = source.lines().map(ToOwned::to_owned).collect();
    set_vmx_value(&mut lines, BASE_STATE_KEY, state.as_vmx_str());
    let mut output = lines.join("\n");
    output.push('\n');
    fs::write(vmx, output)
}

pub(crate) fn ensure_guest_token_for_path(vmx: &Path) -> io::Result<String> {
    if let Some(token) = guest_token_for_path(vmx)? {
        if valid_guest_token(&token) { return Ok(token); }
    }
    rotate_guest_token_for_path(vmx)
}

pub(crate) fn rotate_guest_token_for_path(vmx: &Path) -> io::Result<String> {
    let token = generate_guest_token()?;
    let source = fs::read_to_string(vmx)?;
    let mut lines: Vec<String> = source.lines().map(ToOwned::to_owned).collect();
    set_vmx_value(&mut lines, GUEST_TOKEN_KEY, &token);
    let mut output = lines.join("\n");
    output.push('\n');
    fs::write(vmx, output)?;
    Ok(token)
}

pub(crate) fn guest_token(client: ClientId, vmx: &Path) -> io::Result<Option<String>> {
    let _ = client;
    guest_token_for_path(vmx)
}

pub(crate) fn valid_guest_token(token: &str) -> bool {
    token.len() == 64 && token.chars().all(|character| character.is_ascii_hexdigit())
}

pub(crate) fn vm_identity_key(vmx: &Path) -> io::Result<Option<String>> {
    let uuid = read_vmx_value(vmx, "uuid.bios")?.filter(|value| !value.trim().is_empty());
    let mac = read_vmx_value(vmx, "ethernet0.generatedAddress")?.filter(|value| !value.trim().is_empty());
    Ok(match (uuid, mac) { (Some(uuid), Some(mac)) => Some(format!("{uuid}|{mac}")), _ => None })
}

fn generate_guest_token() -> io::Result<String> {
    let mut bytes = [0_u8; 32];
    getrandom::getrandom(&mut bytes).map_err(|error| io::Error::new(io::ErrorKind::Other, format!("guest token entropy failed: {error}")))?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn remove_vmx_value(lines: &mut Vec<String>, key: &str) {
    let prefix = format!("{key} =");
    lines.retain(|line| !line.trim_start().starts_with(&prefix));
}

fn set_vmx_value(lines: &mut Vec<String>, key: &str, value: &str) {
    let prefix = format!("{key} =");
    if let Some(line) = lines.iter_mut().find(|line| line.trim_start().starts_with(&prefix)) {
        *line = format!("{key} = \"{value}\"");
    } else {
        lines.push(format!("{key} = \"{value}\""));
    }
}
