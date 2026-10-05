mod fusion;
mod workstation;

use crate::client::{ClientId, ClientState};
use std::{
    env,
    ffi::OsStr,
    fs,
    io,
    path::{Path, PathBuf},
    process::{Command, Output},
};

pub use fusion::VmwareFusionProvider;
pub use workstation::VmwareWorkstationProvider;

pub trait Provider {
    fn id(&self) -> &'static str;
    fn detect(&self) -> bool;
    fn provision(&self, client: ClientId) -> io::Result<ClientState>;
    fn status(&self, client: ClientId) -> io::Result<ClientState>;
    fn start(&self, client: ClientId) -> io::Result<ClientState>;
    fn stop(&self, client: ClientId) -> io::Result<ClientState>;
    fn reset(&self, client: ClientId) -> io::Result<ClientState>;
    fn open(&self, client: ClientId) -> io::Result<ClientState>;
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
        return Ok(root.join("base").join("MCE-BASE").join("MCE-BASE.vmx"));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(root
            .join("base")
            .join("MCE-BASE.vmwarevm")
            .join("MCE-BASE.vmx"));
    }

    #[allow(unreachable_code)]
    Err(io::Error::new(io::ErrorKind::Unsupported, "unsupported platform"))
}

pub(crate) fn client_vmx_path(client: ClientId) -> io::Result<PathBuf> {
    if client.is_native() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "native client has no VMX path",
        ));
    }

    let root = runtime_root()?;
    let name = client.as_str();

    #[cfg(target_os = "windows")]
    {
        return Ok(root.join("clients").join(name).join(format!("{name}.vmx")));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(root
            .join("clients")
            .join(format!("{name}.vmwarevm"))
            .join(format!("{name}.vmx")));
    }

    #[allow(unreachable_code)]
    Err(io::Error::new(io::ErrorKind::Unsupported, "unsupported platform"))
}

pub(crate) fn ensure_parent(path: &Path) -> io::Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no parent"))?;
    fs::create_dir_all(parent)
}

pub(crate) fn command_output<I, S>(program: &Path, args: I) -> io::Result<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let output = Command::new(program).args(args).output()?;
    require_success(program, output)
}

fn require_success(program: &Path, output: Output) -> io::Result<String> {
    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
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
