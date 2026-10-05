mod fusion;
mod workstation;

use crate::client::{ClientId, ClientState};
use std::io;

pub use fusion::VmwareFusionProvider;
pub use workstation::VmwareWorkstationProvider;

pub trait Provider {
    fn id(&self) -> &'static str;
    fn detect(&self) -> bool;
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
