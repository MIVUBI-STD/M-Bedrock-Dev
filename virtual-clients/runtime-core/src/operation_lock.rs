use crate::{paths::runtime_root, persistence::reject_unsafe_existing_file};
use fs2::FileExt;
use std::{
    fs::{self, File, OpenOptions},
    io,
};

pub(crate) struct OperationLock {
    file: File,
}

impl OperationLock {
    fn open() -> io::Result<File> {
        let root = runtime_root()?;
        fs::create_dir_all(&root)?;
        let path = root.join(".operation.lock");
        reject_unsafe_existing_file(&path)?;
        OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .open(path)
    }

    pub(crate) fn acquire() -> io::Result<Self> {
        let file = Self::open()?;
        FileExt::try_lock_exclusive(&file).map_err(|error| {
            if error.kind() == io::ErrorKind::WouldBlock {
                io::Error::new(
                    io::ErrorKind::WouldBlock,
                    "another Virtual Clients operation is already running",
                )
            } else {
                error
            }
        })?;
        Ok(Self { file })
    }

    pub(crate) fn acquire_shared() -> io::Result<Self> {
        let file = Self::open()?;
        FileExt::try_lock_shared(&file).map_err(|error| {
            if error.kind() == io::ErrorKind::WouldBlock {
                io::Error::new(
                    io::ErrorKind::WouldBlock,
                    "Virtual Clients state is changing; try again after the current operation finishes",
                )
            } else {
                error
            }
        })?;
        Ok(Self { file })
    }
}

impl Drop for OperationLock {
    fn drop(&mut self) {
        let _ = FileExt::unlock(&self.file);
    }
}
