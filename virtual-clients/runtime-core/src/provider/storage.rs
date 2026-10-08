use crate::{client::ClientId, paths::staging_root};
use std::{ffi::OsStr, fs, io, path::Path};

pub(crate) fn vm_container(vmx: &Path) -> io::Result<&Path> {
    vmx.parent().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "VMX has no parent directory"))
}

pub(crate) fn ensure_parent(path: &Path) -> io::Result<()> {
    fs::create_dir_all(vm_container(path)?)
}

pub(crate) fn remove_vm_container(path: &Path) -> io::Result<()> {
    let container = vm_container(path)?;
    if container.exists() { fs::remove_dir_all(container)?; }
    Ok(())
}

pub(crate) fn promote_staging_vm(staging_vmx: &Path, final_vmx: &Path) -> io::Result<()> {
    if !staging_vmx.is_file() {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "provider reported clone success but staged VMX is missing"));
    }
    let staging = vm_container(staging_vmx)?;
    let final_dir = vm_container(final_vmx)?;
    if final_dir.exists() {
        return Err(io::Error::new(io::ErrorKind::AlreadyExists, format!("client destination already exists: {}", final_dir.display())));
    }
    let parent = final_dir.parent().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "client path has no parent"))?;
    fs::create_dir_all(parent)?;
    fs::rename(staging, final_dir)
}

pub(crate) fn has_suspend_state(vmx: &Path) -> bool {
    let Ok(container) = vm_container(vmx) else { return false; };
    let Ok(entries) = fs::read_dir(container) else { return false; };
    entries.flatten().any(|entry| {
        entry.path().extension().and_then(OsStr::to_str).is_some_and(|extension| extension.eq_ignore_ascii_case("vmss"))
    })
}

pub(crate) fn staging_residue_count() -> io::Result<usize> {
    let staging = staging_root()?;
    if !staging.exists() { return Ok(0); }
    Ok(fs::read_dir(staging)?.filter_map(Result::ok).count())
}

pub(crate) fn cleanup_staging() -> io::Result<()> {
    cleanup_staging_at(&staging_root()?)
}

fn cleanup_staging_at(staging: &Path) -> io::Result<()> {
    if !staging.exists() { return Ok(()); }
    // Clone failures may leave disks in an indeterminate state. Never
    // recursively delete those artifacts just because a new operation started.
    if fs::read_dir(&staging)?.next().transpose()?.is_some() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "staging contains unresolved VM artifacts; inspect and clear them manually before provisioning",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::cleanup_staging_at;
    use std::{fs, io, time::{SystemTime, UNIX_EPOCH}};

    #[test]
    fn unresolved_staging_is_preserved() {
        let suffix = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("virtual-clients-staging-{}-{suffix}", std::process::id()));
        let artifact = root.join("Virtual-01").join("Virtual-01.vmx");
        fs::create_dir_all(artifact.parent().unwrap()).unwrap();
        fs::write(&artifact, b"partial clone").unwrap();
        let error = cleanup_staging_at(&root).expect_err("residue must block cleanup");
        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
        assert_eq!(fs::read(&artifact).unwrap(), b"partial clone");
        fs::remove_dir_all(root).unwrap();
    }
}
