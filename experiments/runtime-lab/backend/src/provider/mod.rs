mod fusion;
mod workstation;

use crate::{
    client::{ClientId, ClientState},
    resources::VIRTUAL_MEMORY_LIMIT_MB,
};
use serde::Serialize;
use std::{
    env,
    ffi::OsStr,
    fs,
    io,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};
use sysinfo::System;

pub use fusion::VmwareFusionProvider;
pub use workstation::VmwareWorkstationProvider;

pub(crate) const READY_SNAPSHOT: &str = "QA_READY";
pub(crate) const CLIENT_VCPUS: &str = "2";
const COMMAND_TIMEOUT: Duration = Duration::from_secs(45);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MemoryMode {
    Ceiling,
}

pub trait Provider {
    fn id(&self) -> &'static str;
    fn memory_mode(&self) -> MemoryMode;
    fn detect(&self) -> bool;
    fn provision(&self, client: ClientId) -> io::Result<ClientState>;
    fn reprovision(&self, client: ClientId) -> io::Result<ClientState>;
    fn memory_limit_mb(&self, client: ClientId) -> io::Result<u64>;
    fn host_working_set_mb(&self, client: ClientId) -> io::Result<Option<u64>>;
    fn identity_key(&self, client: ClientId) -> io::Result<Option<String>>;
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
}

pub fn current_platform_provider() -> Option<Box<dyn Provider>> {
    #[cfg(target_os = "windows")]
    {
        let provider = VmwareWorkstationProvider::default();
        return provider.detect().then(|| Box::new(provider) as Box<dyn Provider>);
    }

    #[cfg(target_os = "macos")]
    {
        let provider = VmwareFusionProvider::default();
        return provider.detect().then(|| Box::new(provider) as Box<dyn Provider>);
    }

    #[allow(unreachable_code)]
    None
}

pub(crate) fn runtime_root() -> io::Result<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let root = env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "LOCALAPPDATA is unavailable"))?;
        return Ok(root.join("M-Bedrock").join("RuntimeLab"));
    }

    #[cfg(target_os = "macos")]
    {
        let home = env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "HOME is unavailable"))?;
        return Ok(home
            .join("Library")
            .join("Application Support")
            .join("M-Bedrock")
            .join("RuntimeLab"));
    }

    #[allow(unreachable_code)]
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Runtime Lab supports Windows and macOS only",
    ))
}

pub(crate) fn base_vmx_path() -> io::Result<PathBuf> {
    let root = runtime_root()?;

    #[cfg(target_os = "windows")]
    {
        return Ok(root.join("base").join("Base").join("Base.vmx"));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(root.join("base").join("Base.vmwarevm").join("Base.vmx"));
    }

    #[allow(unreachable_code)]
    Err(io::Error::new(io::ErrorKind::Unsupported, "unsupported platform"))
}

pub(crate) fn client_vmx_path(client: ClientId) -> io::Result<PathBuf> {
    client_vmx_path_under(client, "clients")
}

pub(crate) fn staging_client_vmx_path(client: ClientId) -> io::Result<PathBuf> {
    let root = runtime_root()?.join("staging");
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
    Err(io::Error::new(io::ErrorKind::Unsupported, "unsupported platform"))
}

fn client_vmx_path_under(client: ClientId, owner: &str) -> io::Result<PathBuf> {
    if client.is_native() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "native client has no VMX path",
        ));
    }

    let root = runtime_root()?.join(owner);
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
    Err(io::Error::new(io::ErrorKind::Unsupported, "unsupported platform"))
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
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let started = Instant::now();
    loop {
        if child.try_wait()?.is_some() {
            let output = child.wait_with_output()?;
            return require_success(program, output.status.success(), &output.stdout, &output.stderr);
        }

        if started.elapsed() >= COMMAND_TIMEOUT {
            let _ = child.kill();
            let _ = child.wait();
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!("{} exceeded {}s timeout", program.display(), COMMAND_TIMEOUT.as_secs()),
            ));
        }

        thread::sleep(Duration::from_millis(100));
    }
}

fn require_success(program: &Path, success: bool, stdout: &[u8], stderr: &[u8]) -> io::Result<String> {
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

pub(crate) fn wait_for_state<F>(mut predicate: F, expected: bool, timeout: Duration) -> io::Result<()>
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

pub(crate) fn snapshot_list_contains(list_output: &str, name: &str) -> bool {
    list_output.lines().map(str::trim).any(|line| line == name)
}

pub(crate) fn apply_virtual_hardware_policy(vmx: &Path) -> io::Result<()> {
    let source = fs::read_to_string(vmx)?;
    let mut lines: Vec<String> = source.lines().map(ToOwned::to_owned).collect();

    set_vmx_value(&mut lines, "numvcpus", CLIENT_VCPUS);
    set_vmx_value(
        &mut lines,
        "memsize",
        &VIRTUAL_MEMORY_LIMIT_MB.to_string(),
    );
    set_vmx_value(&mut lines, "answer.msg.uuid.altered", "I copied it");

    let mut output = lines.join("\n");
    output.push('\n');
    fs::write(vmx, output)
}

pub(crate) fn read_vmx_value(vmx: &Path, key: &str) -> io::Result<Option<String>> {
    let source = fs::read_to_string(vmx)?;
    let prefix = format!("{key} =");
    Ok(source.lines().find_map(|line| {
        let trimmed = line.trim();
        trimmed.strip_prefix(&prefix).map(|value| {
            value.trim().trim_matches('"').to_string()
        })
    }))
}

pub(crate) fn read_vmx_memory(vmx: &Path) -> io::Result<u64> {
    read_vmx_value(vmx, "memsize")?
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "memsize is missing from VMX"))?
        .parse::<u64>()
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "invalid memsize in VMX"))
}

fn set_vmx_value(lines: &mut Vec<String>, key: &str, value: &str) {
    let prefix = format!("{key} =");
    if let Some(line) = lines.iter_mut().find(|line| line.trim_start().starts_with(&prefix)) {
        *line = format!("{key} = \"{value}\"");
    } else {
        lines.push(format!("{key} = \"{value}\""));
    }
}

pub(crate) fn host_working_set_mb(vmx: &Path) -> Option<u64> {
    let target = vmx.to_string_lossy().to_ascii_lowercase();
    let system = System::new_all();

    let bytes = system
        .processes()
        .values()
        .filter(|process| {
            process.cmd().iter().any(|arg| {
                arg.to_ascii_lowercase().contains(&target)
            })
        })
        .map(|process| process.memory())
        .sum::<u64>();

    (bytes > 0).then_some(bytes / 1024 / 1024)
}

#[cfg(test)]
mod tests {
    use super::{listed_as_running, snapshot_list_contains};

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
}


pub(crate) fn cleanup_staging() -> io::Result<()> {
    let staging = runtime_root()?.join("staging");
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
