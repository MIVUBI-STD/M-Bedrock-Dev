mod fusion;
mod workstation;

use crate::{
    client::{ClientId, ClientState},
    paths::{client_root, staging_root},
    profile::current_base_vmx_path,
    resources::VIRTUAL_MEMORY_LIMIT_MB,
};
use std::{
    ffi::OsStr,
    fs, io,
    net::IpAddr,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};
use sysinfo::System;

pub use fusion::VmwareFusionProvider;
pub use workstation::VmwareWorkstationProvider;

pub(crate) const READY_SNAPSHOT: &str = "QA_READY";
pub(crate) const GUEST_TOKEN_KEY: &str = "guestinfo.virtualclients.token";
pub(crate) const BASE_STATE_KEY: &str = "guestinfo.virtualclients.baseState";
pub(crate) const CLIENT_VCPUS: &str = "2";
const COMMAND_TIMEOUT: Duration = Duration::from_secs(45);
pub(crate) const DISK_STATE_TIMEOUT: Duration = Duration::from_secs(180);

pub trait Provider {
    fn id(&self) -> &'static str;
    fn version(&self) -> Option<String>;
    fn detect(&self) -> bool;
    fn provision(&self, client: ClientId) -> io::Result<ClientState>;
    fn reprovision(&self, client: ClientId) -> io::Result<ClientState>;
    fn memory_limit_mb(&self, client: ClientId) -> io::Result<u64>;
    fn host_working_sets_mb(&self) -> io::Result<Vec<(ClientId, u64)>> {
        Ok(host_working_sets_mb())
    }
    fn guest_tools_ready(&self, client: ClientId) -> io::Result<Option<bool>>;
    fn guest_ip_address(&self, client: ClientId) -> io::Result<Option<String>>;
    fn identity_key(&self, client: ClientId) -> io::Result<Option<String>>;

    fn network_mode(&self, client: ClientId) -> io::Result<Option<String>> {
        let vmx = client_vmx_path(client)?;
        read_vmx_value(&vmx, "ethernet0.connectionType")
    }

    fn graphics_3d_enabled(&self, client: ClientId) -> io::Result<Option<bool>> {
        let vmx = client_vmx_path(client)?;
        Ok(read_vmx_value(&vmx, "mks.enable3d")?.map(|value| value.eq_ignore_ascii_case("TRUE")))
    }
    fn status(&self, client: ClientId) -> io::Result<ClientState>;
    fn start(&self, client: ClientId) -> io::Result<ClientState>;
    fn suspend(&self, client: ClientId) -> io::Result<ClientState>;
    fn stop(&self, client: ClientId) -> io::Result<ClientState>;
    fn restart(&self, client: ClientId) -> io::Result<ClientState>;
    fn set_ready(&self, client: ClientId) -> io::Result<ClientState>;
    fn has_ready(&self, client: ClientId) -> io::Result<bool>;
    fn reset(&self, client: ClientId) -> io::Result<ClientState>;
    fn open(&self, client: ClientId) -> io::Result<ClientState>;
    fn is_running_path(&self, vmx: &Path) -> io::Result<bool>;
    fn start_validation_vm(&self, vmx: &Path) -> io::Result<()>;
    fn stop_validation_vm(&self, vmx: &Path) -> io::Result<()>;
    fn guest_ip_for_path(&self, vmx: &Path) -> io::Result<Option<String>>;
}

pub fn current_platform_provider() -> Option<Box<dyn Provider>> {
    #[cfg(target_os = "windows")]
    {
        let provider = VmwareWorkstationProvider::default();
        return provider
            .detect()
            .then(|| Box::new(provider) as Box<dyn Provider>);
    }

    #[cfg(target_os = "macos")]
    {
        let provider = VmwareFusionProvider::default();
        return provider
            .detect()
            .then(|| Box::new(provider) as Box<dyn Provider>);
    }

    #[allow(unreachable_code)]
    None
}

pub(crate) fn base_vmx_path() -> io::Result<PathBuf> {
    current_base_vmx_path()
}

pub(crate) fn client_vmx_path(client: ClientId) -> io::Result<PathBuf> {
    client_vmx_path_under(client, client_root()?)
}

pub(crate) fn staging_client_vmx_path(client: ClientId) -> io::Result<PathBuf> {
    let root = staging_root()?;
    let name = format!("{}-{}", client.as_str(), std::process::id());

    #[cfg(target_os = "windows")]
    {
        return Ok(root.join(&name).join(format!("{}.vmx", client.as_str())));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(root
            .join(format!("{name}.vmwarevm"))
            .join(format!("{}.vmx", client.as_str())));
    }

    #[allow(unreachable_code)]
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "unsupported platform",
    ))
}

fn client_vmx_path_under(client: ClientId, root: PathBuf) -> io::Result<PathBuf> {
    if client.is_native() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "native client has no VMX path",
        ));
    }

    let name = client.as_str();

    #[cfg(target_os = "windows")]
    {
        return Ok(root.join(name).join(format!("{name}.vmx")));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(root
            .join(format!("{name}.vmwarevm"))
            .join(format!("{name}.vmx")));
    }

    #[allow(unreachable_code)]
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "unsupported platform",
    ))
}

pub(crate) fn vm_container(vmx: &Path) -> io::Result<&Path> {
    vmx.parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "VMX has no parent directory"))
}

pub(crate) fn ensure_parent(path: &Path) -> io::Result<()> {
    fs::create_dir_all(vm_container(path)?)
}

pub(crate) fn remove_vm_container(path: &Path) {
    if let Ok(container) = vm_container(path) {
        let _ = fs::remove_dir_all(container);
    }
}

pub(crate) fn promote_staging_vm(staging_vmx: &Path, final_vmx: &Path) -> io::Result<()> {
    if !staging_vmx.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "provider reported clone success but staged VMX is missing",
        ));
    }

    let staging = vm_container(staging_vmx)?;
    let final_dir = vm_container(final_vmx)?;

    if final_dir.exists() {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            format!("client destination already exists: {}", final_dir.display()),
        ));
    }

    let parent = final_dir
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "client path has no parent"))?;
    fs::create_dir_all(parent)?;
    fs::rename(staging, final_dir)
}

pub(crate) fn command_output<I, S>(program: &Path, args: I) -> io::Result<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    command_output_with_timeout(program, args, COMMAND_TIMEOUT)
}

pub(crate) fn command_output_with_timeout<I, S>(
    program: &Path,
    args: I,
    timeout: Duration,
) -> io::Result<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let started = Instant::now();
    loop {
        if child.try_wait()?.is_some() {
            let output = child.wait_with_output()?;
            return require_success(
                program,
                output.status.success(),
                &output.stdout,
                &output.stderr,
            );
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!(
                    "{} exceeded {}s timeout",
                    program.display(),
                    timeout.as_secs()
                ),
            ));
        }

        thread::sleep(Duration::from_millis(100));
    }
}

fn require_success(
    program: &Path,
    success: bool,
    stdout: &[u8],
    stderr: &[u8],
) -> io::Result<String> {
    if success {
        return Ok(String::from_utf8_lossy(stdout).trim().to_string());
    }

    let stderr = String::from_utf8_lossy(stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(stdout).trim().to_string();
    let detail = if !stderr.is_empty() { stderr } else { stdout };

    Err(io::Error::new(
        io::ErrorKind::Other,
        format!("{} failed: {}", program.display(), detail),
    ))
}

pub(crate) fn listed_as_running(list_output: &str, vmx: &Path) -> bool {
    let target = vmx.to_string_lossy();
    list_output
        .lines()
        .map(str::trim)
        .any(|line| line.eq_ignore_ascii_case(&target))
}

pub(crate) fn has_suspend_state(vmx: &Path) -> bool {
    let Ok(container) = vm_container(vmx) else {
        return false;
    };
    let Ok(entries) = fs::read_dir(container) else {
        return false;
    };

    entries.flatten().any(|entry| {
        entry
            .path()
            .extension()
            .and_then(OsStr::to_str)
            .is_some_and(|extension| extension.eq_ignore_ascii_case("vmss"))
    })
}

pub(crate) fn wait_for_state<F>(
    mut predicate: F,
    expected: bool,
    timeout: Duration,
) -> io::Result<()>
where
    F: FnMut() -> io::Result<bool>,
{
    let started = Instant::now();
    loop {
        if predicate()? == expected {
            return Ok(());
        }
        if started.elapsed() >= timeout {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "virtual machine did not reach the expected power state",
            ));
        }
        thread::sleep(Duration::from_millis(250));
    }
}

pub(crate) fn parse_guest_ip(output: &str) -> Option<String> {
    output.lines().find_map(|line| {
        let value = line.trim();
        value
            .parse::<IpAddr>()
            .ok()
            .map(|address| address.to_string())
    })
}

pub(crate) fn snapshot_list_contains(list_output: &str, name: &str) -> bool {
    list_output.lines().map(str::trim).any(|line| line == name)
}

pub(crate) fn apply_virtual_hardware_policy(vmx: &Path) -> io::Result<()> {
    let source = fs::read_to_string(vmx)?;
    let mut lines: Vec<String> = source.lines().map(ToOwned::to_owned).collect();

    set_vmx_value(&mut lines, "numvcpus", CLIENT_VCPUS);
    set_vmx_value(&mut lines, "memsize", &VIRTUAL_MEMORY_LIMIT_MB.to_string());
    set_vmx_value(&mut lines, "mks.enable3d", "TRUE");
    set_vmx_value(&mut lines, "ethernet0.present", "TRUE");
    set_vmx_value(&mut lines, "ethernet0.startConnected", "TRUE");
    set_vmx_value(&mut lines, "answer.msg.uuid.altered", "I copied it");

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
        trimmed
            .strip_prefix(&prefix)
            .map(|value| value.trim().trim_matches('"').to_string())
    }))
}

pub(crate) fn read_vmx_memory(vmx: &Path) -> io::Result<u64> {
    read_vmx_value(vmx, "memsize")?
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "memsize is missing from VMX"))?
        .parse::<u64>()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid memsize in VMX"))
}

pub(crate) fn guest_token_for_path(vmx: &Path) -> io::Result<Option<String>> {
    read_vmx_value(vmx, GUEST_TOKEN_KEY)
}

pub(crate) fn base_state_for_path(vmx: &Path) -> io::Result<Option<String>> {
    read_vmx_value(vmx, BASE_STATE_KEY)
}

pub(crate) fn set_base_state_for_path(vmx: &Path, state: &str) -> io::Result<()> {
    if !matches!(state, "REGISTERED" | "FINALIZING" | "FINALIZED") {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "invalid Base lifecycle state",
        ));
    }

    let source = fs::read_to_string(vmx)?;
    let mut lines: Vec<String> = source.lines().map(ToOwned::to_owned).collect();
    set_vmx_value(&mut lines, BASE_STATE_KEY, state);
    let mut output = lines.join("\n");
    output.push('\n');
    fs::write(vmx, output)
}

pub(crate) fn ensure_guest_token_for_path(vmx: &Path) -> io::Result<String> {
    if let Some(token) = guest_token_for_path(vmx)? {
        if valid_guest_token(&token) {
            return Ok(token);
        }
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

fn generate_guest_token() -> io::Result<String> {
    let mut bytes = [0_u8; 32];
    getrandom::getrandom(&mut bytes).map_err(|error| {
        io::Error::new(
            io::ErrorKind::Other,
            format!("guest token entropy failed: {error}"),
        )
    })?;
    Ok(bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>())
}

pub(crate) fn guest_token(client: ClientId) -> io::Result<Option<String>> {
    guest_token_for_path(&client_vmx_path(client)?)
}

fn valid_guest_token(token: &str) -> bool {
    token.len() == 64 && token.chars().all(|character| character.is_ascii_hexdigit())
}

pub(crate) fn vm_identity_key(vmx: &Path) -> io::Result<Option<String>> {
    let uuid = read_vmx_value(vmx, "uuid.bios")?.filter(|value| !value.trim().is_empty());
    let mac =
        read_vmx_value(vmx, "ethernet0.generatedAddress")?.filter(|value| !value.trim().is_empty());

    Ok(match (uuid, mac) {
        (Some(uuid), Some(mac)) => Some(format!("{uuid}|{mac}")),
        _ => None,
    })
}

pub(crate) fn guest_tools_state_ready(state: &str) -> bool {
    state.trim().eq_ignore_ascii_case("running")
}

fn set_vmx_value(lines: &mut Vec<String>, key: &str, value: &str) {
    let prefix = format!("{key} =");
    if let Some(line) = lines
        .iter_mut()
        .find(|line| line.trim_start().starts_with(&prefix))
    {
        *line = format!("{key} = \"{value}\"");
    } else {
        lines.push(format!("{key} = \"{value}\""));
    }
}

pub(crate) fn host_working_sets_mb() -> Vec<(ClientId, u64)> {
    let system = System::new_all();
    let mut result = Vec::new();

    for client in ClientId::VIRTUAL {
        let Ok(vmx) = client_vmx_path(client) else {
            continue;
        };
        if !vmx.is_file() {
            continue;
        }

        let target = vmx.to_string_lossy().to_ascii_lowercase();
        let bytes = system
            .processes()
            .values()
            .filter(|process| {
                process
                    .cmd()
                    .iter()
                    .any(|arg| arg.to_ascii_lowercase().contains(&target))
            })
            .map(|process| process.memory())
            .sum::<u64>();

        if bytes > 0 {
            result.push((client, bytes / 1024 / 1024));
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::{
        apply_virtual_hardware_policy, guest_token_for_path, guest_tools_state_ready,
        listed_as_running, parse_guest_ip, snapshot_list_contains, valid_guest_token,
        BASE_STATE_KEY, GUEST_TOKEN_KEY,
    };
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn detects_running_vm_from_vmrun_list() {
        let output = "Total running VMs: 1\nC:\\Lab\\Virtual-01\\Virtual-01.vmx\n";
        assert!(listed_as_running(
            output,
            std::path::Path::new(r"C:\Lab\Virtual-01\Virtual-01.vmx")
        ));
    }

    #[test]
    fn ready_snapshot_match_is_exact() {
        let output = "Total snapshots: 2\nQA_READY\nBefore Update\n";
        assert!(snapshot_list_contains(output, "QA_READY"));
        assert!(!snapshot_list_contains(output, "QA"));
    }

    #[test]
    fn tools_state_requires_running() {
        assert!(guest_tools_state_ready("running"));
        assert!(guest_tools_state_ready("Running\n"));
        assert!(!guest_tools_state_ready("installed"));
        assert!(!guest_tools_state_ready("not running"));
    }

    #[test]
    fn guest_ip_parser_requires_real_ip() {
        assert_eq!(
            parse_guest_ip("192.168.10.42\n"),
            Some("192.168.10.42".into())
        );
        assert_eq!(parse_guest_ip("Error: Tools not ready"), None);
    }

    #[test]
    fn vm_identity_requires_both_uuid_and_mac() {
        let root = unique_temp_dir("vm-identity");
        fs::create_dir_all(&root).unwrap();

        let vmx = root.join("Virtual-01.vmx");
        fs::write(
            &vmx,
            "uuid.bios = \"uuid-1\"\nethernet0.generatedAddress = \"00:50:56:AA:BB:CC\"\n",
        )
        .unwrap();
        assert_eq!(
            super::vm_identity_key(&vmx).unwrap().as_deref(),
            Some("uuid-1|00:50:56:AA:BB:CC")
        );

        fs::write(&vmx, "uuid.bios = \"uuid-1\"\n").unwrap();
        assert_eq!(super::vm_identity_key(&vmx).unwrap(), None);

        fs::write(
            &vmx,
            "ethernet0.generatedAddress = \"00:50:56:AA:BB:CC\"\n",
        )
        .unwrap();
        assert_eq!(super::vm_identity_key(&vmx).unwrap(), None);

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn guest_token_format_is_strict() {
        assert!(valid_guest_token(&"a".repeat(64)));
        assert!(!valid_guest_token("short"));
        assert!(!valid_guest_token(&"z".repeat(64)));
    }

    #[test]
    fn base_state_is_single_canonical_vmx_key() {
        let root = unique_temp_dir("base-state");
        fs::create_dir_all(&root).unwrap();
        let vmx = root.join("Base.vmx");
        fs::write(&vmx, "config.version = \"8\"\n").unwrap();

        super::set_base_state_for_path(&vmx, "REGISTERED").unwrap();
        assert_eq!(
            super::base_state_for_path(&vmx).unwrap().as_deref(),
            Some("REGISTERED")
        );
        assert!(fs::read_to_string(&vmx).unwrap().contains(BASE_STATE_KEY));
        assert!(super::set_base_state_for_path(&vmx, "READY").is_err());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn virtual_hardware_policy_rotates_inherited_guest_tokens_per_clone() {
        let root = unique_temp_dir("guest-token-rotation");
        fs::create_dir_all(&root).unwrap();

        let inherited = "a".repeat(64);
        let base = root.join("Base.vmx");
        fs::write(&base, format!("{GUEST_TOKEN_KEY} = \"{inherited}\"\n")).unwrap();

        let mut virtual_tokens = Vec::new();
        for name in ["Virtual-01", "Virtual-02", "Virtual-03"] {
            let vmx = root.join(format!("{name}.vmx"));
            fs::copy(&base, &vmx).unwrap();
            apply_virtual_hardware_policy(&vmx).unwrap();

            let token = guest_token_for_path(&vmx).unwrap().unwrap();
            assert!(valid_guest_token(&token));
            assert_ne!(token, inherited);
            virtual_tokens.push(token);
        }

        assert_eq!(
            guest_token_for_path(&base).unwrap().as_deref(),
            Some(inherited.as_str())
        );
        assert_ne!(virtual_tokens[0], virtual_tokens[1]);
        assert_ne!(virtual_tokens[0], virtual_tokens[2]);
        assert_ne!(virtual_tokens[1], virtual_tokens[2]);

        fs::remove_dir_all(root).unwrap();
    }

    fn unique_temp_dir(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!(
            "m-bedrock-virtual-clients-{label}-{}-{nonce}",
            std::process::id()
        ))
    }
}

pub(crate) fn cleanup_staging() -> io::Result<()> {
    let staging = staging_root()?;
    if !staging.exists() {
        return Ok(());
    }

    for entry in fs::read_dir(&staging)? {
        let path = entry?.path();
        if path.is_dir() {
            fs::remove_dir_all(path)?;
        } else {
            fs::remove_file(path)?;
        }
    }

    Ok(())
}
