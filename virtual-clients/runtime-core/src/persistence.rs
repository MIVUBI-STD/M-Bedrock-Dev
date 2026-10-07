use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
};

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;
#[cfg(windows)]
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x00000400;

fn backup_path(path: &Path) -> io::Result<PathBuf> {
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidInput, "metadata path has no parent")
    })?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "metadata filename is invalid")
        })?;
    Ok(parent.join(format!(".{name}.bak")))
}

fn temporary_path(path: &Path) -> io::Result<PathBuf> {
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidInput, "metadata path has no parent")
    })?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "metadata filename is invalid")
        })?;
    Ok(parent.join(format!(".{name}.{}.tmp", std::process::id())))
}

pub(crate) fn reject_unsafe_existing_file(path: &Path) -> io::Result<()> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) || !metadata.file_type().is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("metadata path is not a regular file: {}", path.display()),
        ));
    }
    Ok(())
}

#[cfg(windows)]
fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

#[cfg(not(windows))]
fn is_reparse_point(_metadata: &fs::Metadata) -> bool {
    false
}

fn recover_interrupted_replace(path: &Path) -> io::Result<()> {
    let backup = backup_path(path)?;
    reject_unsafe_existing_file(path)?;
    reject_unsafe_existing_file(&backup)?;

    match (path.exists(), backup.exists()) {
        (false, true) => fs::rename(backup, path),
        (true, true) => fs::remove_file(backup),
        _ => Ok(()),
    }
}

pub(crate) fn read_text_recovering(path: &Path) -> io::Result<String> {
    recover_interrupted_replace(path)?;
    fs::read_to_string(path)
}

pub(crate) fn write_text_transactional(path: &Path, contents: &str) -> io::Result<()> {
    let parent = path.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidInput, "metadata path has no parent")
    })?;
    fs::create_dir_all(parent)?;
    recover_interrupted_replace(path)?;

    let temporary = temporary_path(path)?;
    let backup = backup_path(path)?;
    reject_unsafe_existing_file(&temporary)?;
    reject_unsafe_existing_file(&backup)?;
    if temporary.exists() {
        fs::remove_file(&temporary)?;
    }

    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)?;
    file.write_all(contents.as_bytes())?;
    file.sync_all()?;
    drop(file);

    if backup.exists() {
        fs::remove_file(&backup)?;
    }

    let had_existing = path.exists();
    if had_existing {
        fs::rename(path, &backup)?;
    }

    match fs::rename(&temporary, path) {
        Ok(()) => {
            if had_existing && backup.exists() {
                fs::remove_file(backup)?;
            }
            Ok(())
        }
        Err(error) => {
            let _ = fs::remove_file(&temporary);
            if had_existing && backup.exists() && !path.exists() {
                let _ = fs::rename(&backup, path);
            }
            Err(error)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{backup_path, read_text_recovering, write_text_transactional};
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn transactional_write_replaces_existing_metadata() {
        let root = unique_temp_dir("replace");
        let path = root.join("state.json");

        write_text_transactional(&path, "one\n").unwrap();
        write_text_transactional(&path, "two\n").unwrap();

        assert_eq!(read_text_recovering(&path).unwrap(), "two\n");
        assert!(!backup_path(&path).unwrap().exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn read_recovers_interrupted_backup_state() {
        let root = unique_temp_dir("recover");
        fs::create_dir_all(&root).unwrap();
        let path = root.join("state.json");
        let backup = backup_path(&path).unwrap();

        fs::write(&backup, "old\n").unwrap();
        assert_eq!(read_text_recovering(&path).unwrap(), "old\n");
        assert!(path.is_file());
        assert!(!backup.exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn read_discards_stale_backup_after_successful_replace() {
        let root = unique_temp_dir("stale-backup");
        fs::create_dir_all(&root).unwrap();
        let path = root.join("state.json");
        let backup = backup_path(&path).unwrap();

        fs::write(&path, "new\n").unwrap();
        fs::write(&backup, "old\n").unwrap();

        assert_eq!(read_text_recovering(&path).unwrap(), "new\n");
        assert!(!backup.exists());

        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn metadata_symlink_is_rejected() {
        use std::os::unix::fs::symlink;
        let root = unique_temp_dir("symlink");
        fs::create_dir_all(&root).unwrap();
        let target = root.join("target.txt");
        let path = root.join("state.json");
        fs::write(&target, "private\n").unwrap();
        symlink(&target, &path).unwrap();

        assert!(read_text_recovering(&path).is_err());
        assert!(write_text_transactional(&path, "replacement\n").is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), "private\n");

        fs::remove_dir_all(root).unwrap();
    }

    fn unique_temp_dir(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!(
            "m-bedrock-virtual-clients-persistence-{label}-{}-{nonce}",
            std::process::id()
        ))
    }
}
