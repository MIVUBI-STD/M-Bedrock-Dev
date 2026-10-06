use crate::{
    client::{ClientId, ClientState, ClientStatus, DestructiveConfirmation, IdentityState},
    diagnostics::{collect as collect_diagnostics, DiagnosticsReport},
    doctor::{doctor, DoctorReport},
    guest::{query_guest_status, GuestStatus},
    journal::{record_operation, OperationKind},
    paths::runtime_root,
    policy::{engine_policy, EnginePolicy, MAX_VIRTUAL_CLIENTS},
    profile::{
        current_base_vmx_path, load_client_profile, native_minecraft_profile, profile_status,
        require_base_matches_native, require_client_matches_native, write_client_profile,
        write_verified_base_profile, write_verified_client_identities, BaseProfile, BaseState,
        MinecraftProfile, ProfileParity, ProfileStatus,
    },
    provider::{
        base_state_for_path, cleanup_staging, current_platform_provider,
        ensure_guest_token_for_path, guest_token, set_base_state_for_path, Provider,
    },
    resources::{current_host_pressure, start_delay_secs, HostPressure, VIRTUAL_MEMORY_LIMIT_MB},
    schema::ensure_runtime_schema,
    support::{capture_time_ms, write_support_bundle, EngineSnapshot, SupportBundleResult},
    update::{check_update, stage_update, StagedUpdate, UpdateCheck},
};
use fs2::FileExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io, thread,
    time::Duration,
};

#[derive(Debug, Default)]
pub struct VirtualClients;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub provider: Option<&'static str>,
    pub runtime_profile: ProfileStatus,
    pub pressure: HostPressure,
    pub clients: Vec<ClientStatus>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceView {
    pub requested_virtual_clients: usize,
    pub recommended_virtual_clients: usize,
    pub running_virtual_clients: usize,
    pub suspended_virtual_clients: usize,
    pub stopped_virtual_clients: usize,
    pub virtual_memory_limit_mb: u64,
    pub observed_working_set_mb: u64,
    pub observed_working_set_instances: usize,
    pub pressure: HostPressure,
}

struct OperationLock {
    file: File,
}

impl OperationLock {
    fn open() -> io::Result<(std::path::PathBuf, File)> {
        let root = runtime_root()?;
        fs::create_dir_all(&root)?;
        let path = root.join(".operation.lock");
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;
        Ok((root, file))
    }

    fn acquire() -> io::Result<Self> {
        let (root, file) = Self::open()?;
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
        ensure_runtime_schema(&root)?;
        Ok(Self { file })
    }

    fn acquire_shared() -> io::Result<Self> {
        let (_, file) = Self::open()?;
        FileExt::try_lock_shared(&file).map_err(|error| {
            if error.kind() == io::ErrorKind::WouldBlock {
                io::Error::new(
                    io::ErrorKind::WouldBlock,
                    "Virtual Clients state is being modified",
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

fn classify_identity_state<'a>(
    current: Option<&'a str>,
    peers: impl IntoIterator<Item = Option<&'a str>>,
) -> IdentityState {
    let Some(current) = current else {
        return IdentityState::Unknown;
    };

    for peer in peers {
        let Some(peer) = peer else {
            return IdentityState::Unknown;
        };
        if peer == current {
            return IdentityState::Duplicate;
        }
    }

    IdentityState::Unique
}

fn vm_identity_state(provider: &dyn Provider, client: ClientId) -> IdentityState {
    let current = provider.identity_key(client).ok().flatten();
    let mut peers = Vec::new();

    for other in ClientId::VIRTUAL {
        if other == client {
            continue;
        }

        match provider.status(other) {
            Ok(ClientState::NotProvisioned) => continue,
            Ok(_) => peers.push(provider.identity_key(other).ok().flatten()),
            Err(_) => peers.push(None),
        }
    }

    classify_identity_state(
        current.as_deref(),
        peers.iter().map(|identity| identity.as_deref()),
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LifecycleAction {
    Start,
    Suspend,
    Stop,
    Open,
    Restart,
    SetReady,
    Reset,
    Reprovision,
}

fn validate_lifecycle_action(
    client: ClientId,
    action: LifecycleAction,
    state: ClientState,
    ready_snapshot: bool,
) -> io::Result<()> {
    if client.is_native() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Native lifecycle is host-managed",
        ));
    }

    let valid = match action {
        LifecycleAction::Start => matches!(
            state,
            ClientState::Stopped | ClientState::Suspended | ClientState::Running
        ),
        LifecycleAction::Suspend => {
            matches!(state, ClientState::Running | ClientState::Suspended)
        }
        LifecycleAction::Stop => matches!(
            state,
            ClientState::Stopped | ClientState::Suspended | ClientState::Running
        ),
        LifecycleAction::Open => matches!(
            state,
            ClientState::Stopped | ClientState::Suspended | ClientState::Running
        ),
        LifecycleAction::Restart => state == ClientState::Running,
        LifecycleAction::SetReady => state == ClientState::Stopped && !ready_snapshot,
        LifecycleAction::Reset => {
            matches!(
                state,
                ClientState::Stopped | ClientState::Suspended | ClientState::Running
            ) && ready_snapshot
        }
        LifecycleAction::Reprovision => state == ClientState::Stopped,
    };

    if valid {
        return Ok(());
    }

    let action_name = match action {
        LifecycleAction::Start => "start",
        LifecycleAction::Suspend => "suspend",
        LifecycleAction::Stop => "stop",
        LifecycleAction::Open => "open",
        LifecycleAction::Restart => "restart",
        LifecycleAction::SetReady => "set-ready",
        LifecycleAction::Reset => "reset",
        LifecycleAction::Reprovision => "reprovision",
    };

    Err(io::Error::new(
        io::ErrorKind::InvalidInput,
        format!(
            "{} cannot {} from state {:?} with QA_READY={ready_snapshot}",
            client.as_str(),
            action_name,
            state
        ),
    ))
}

fn restore_batch_state(
    provider: &dyn Provider,
    started: &[(ClientId, ClientState)],
) -> Vec<&'static str> {
    let mut failed = Vec::new();

    for (client, original_state) in started.iter().rev() {
        let result = match original_state {
            ClientState::Suspended => provider.suspend(*client).map(|_| ()),
            ClientState::Stopped => provider.stop(*client).map(|_| ()),
            _ => Ok(()),
        };

        if result.is_err() {
            failed.push(client.as_str());
        }
    }

    failed
}

fn with_rollback_context(error: io::Error, failed: &[&'static str]) -> io::Error {
    if failed.is_empty() {
        return error;
    }

    io::Error::new(
        error.kind(),
        format!(
            "{error}; rollback incomplete for {}. Run status to inspect the current state.",
            failed.join(", ")
        ),
    )
}

fn guest_status_once(provider: &dyn Provider, client: ClientId) -> Option<GuestStatus> {
    let ip = provider.guest_ip_address(client).ok().flatten()?;
    let token = guest_token(client).ok().flatten()?;
    query_guest_status(&ip, &token, Duration::from_secs(1)).ok()
}

fn lineage_parity(native: Option<&MinecraftProfile>, client: ClientId) -> ProfileParity {
    match (native, load_client_profile(client).ok()) {
        (Some(native), Some(profile)) if native.version == profile.base_minecraft_version => {
            ProfileParity::Match
        }
        (Some(_), Some(_)) => ProfileParity::Mismatch,
        _ => ProfileParity::Unknown,
    }
}

fn version_parity(native: Option<&MinecraftProfile>, guest: Option<&GuestStatus>) -> ProfileParity {
    match (native, guest.and_then(|status| status.minecraft.as_ref())) {
        (Some(native), Some(guest)) if native.version == guest.version => ProfileParity::Match,
        (Some(_), Some(_)) => ProfileParity::Mismatch,
        _ => ProfileParity::Unknown,
    }
}

fn guest_probe_error_is_terminal(error: &io::Error) -> bool {
    matches!(
        error.kind(),
        io::ErrorKind::InvalidData
            | io::ErrorKind::InvalidInput
            | io::ErrorKind::PermissionDenied
            | io::ErrorKind::Other
    )
}

fn wait_for_guest_compatibility(
    provider: &dyn Provider,
    client: ClientId,
    timeout: Duration,
    enforce_verified_windows_identity: bool,
) -> io::Result<GuestStatus> {
    let native = native_minecraft_profile().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Native Minecraft Education version could not be detected",
        )
    })?;
    let token = guest_token(client)?.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            format!("{} Guest Agent token is missing", client.as_str()),
        )
    })?;
    let started = std::time::Instant::now();

    loop {
        if let Some(ip) = provider.guest_ip_address(client)? {
            match query_guest_status(&ip, &token, Duration::from_secs(2)) {
                Ok(status) => {
                    let guest = status.minecraft.as_ref().ok_or_else(|| {
                        io::Error::new(
                            io::ErrorKind::NotFound,
                            format!(
                                "{} Guest Agent cannot detect Minecraft Education",
                                client.as_str()
                            ),
                        )
                    })?;

                    if status.agent_version != env!("CARGO_PKG_VERSION") {
                        return Err(io::Error::new(
                            io::ErrorKind::InvalidData,
                            format!(
                                "{} Guest Agent version {} does not match backend {}",
                                client.as_str(),
                                status.agent_version,
                                env!("CARGO_PKG_VERSION")
                            ),
                        ));
                    }

                    if enforce_verified_windows_identity {
                        if let Some(expected_windows_identity) = load_client_profile(client)
                            .ok()
                            .and_then(|profile| profile.verified_windows_identity)
                        {
                            let current_windows_identity =
                                status.machine_identity.as_deref().ok_or_else(|| {
                                    io::Error::new(
                                        io::ErrorKind::InvalidData,
                                        format!(
                                            "{} Windows identity cannot be verified against saved provenance",
                                            client.as_str()
                                        ),
                                    )
                                })?;
                            if current_windows_identity != expected_windows_identity {
                                return Err(io::Error::new(
                                    io::ErrorKind::InvalidData,
                                    format!(
                                        "{} Windows identity changed after verification; reprovision or run verify-identities after resolving the identity change",
                                        client.as_str()
                                    ),
                                ));
                            }
                        }
                    }

                    if guest.version != native.version {
                        return Err(io::Error::new(
                            io::ErrorKind::InvalidData,
                            format!(
                                "{} Minecraft Education version {} does not match Native {}",
                                client.as_str(),
                                guest.version,
                                native.version
                            ),
                        ));
                    }

                    return Ok(status);
                }
                Err(error) if guest_probe_error_is_terminal(&error) => {
                    return Err(io::Error::new(
                        error.kind(),
                        format!("{} Guest Agent probe failed: {error}", client.as_str()),
                    ));
                }
                Err(_) => {}
            }
        }

        if started.elapsed() >= timeout {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                format!(
                    "{} Guest Agent did not become ready within {}s",
                    client.as_str(),
                    timeout.as_secs()
                ),
            ));
        }

        thread::sleep(Duration::from_secs(1));
    }
}

fn windows_identity_state(
    provider: &dyn Provider,
    client: ClientId,
    guest: Option<&GuestStatus>,
) -> IdentityState {
    let Some(identity) = guest.and_then(|status| status.machine_identity.as_deref()) else {
        return IdentityState::Unknown;
    };

    for other in ClientId::VIRTUAL {
        if other == client {
            continue;
        }
        if provider.status(other).ok() != Some(ClientState::Running) {
            return IdentityState::Unknown;
        }
        let Some(other_identity) =
            guest_status_once(provider, other).and_then(|status| status.machine_identity)
        else {
            return IdentityState::Unknown;
        };
        if other_identity == identity {
            return IdentityState::Duplicate;
        }
    }

    IdentityState::Unique
}

fn identity_fingerprint(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}

fn verify_identity_provenance(provider: &dyn Provider) -> io::Result<Vec<ClientStatus>> {
    let native = native_minecraft_profile();

    let mut vm_identities = Vec::with_capacity(3);
    let mut windows_identities = Vec::with_capacity(3);
    let mut guests = Vec::with_capacity(3);

    for client in ClientId::VIRTUAL {
        require_client_matches_native(client)?;
        if provider.status(client)? != ClientState::Running {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "all Virtual instances must be RUNNING before verify-identities",
            ));
        }

        let vm_identity = provider.identity_key(client)?.ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("{} VM identity is unavailable", client.as_str()),
            )
        })?;
        let guest = wait_for_guest_compatibility(provider, client, Duration::from_secs(30), false)?;
        let windows_identity = guest.machine_identity.clone().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("{} Windows identity is unavailable", client.as_str()),
            )
        })?;

        vm_identities.push((client, vm_identity));
        windows_identities.push((client, windows_identity));
        guests.push((client, guest));
    }

    for left in 0..ClientId::VIRTUAL.len() {
        for right in (left + 1)..ClientId::VIRTUAL.len() {
            if vm_identities[left].1 == vm_identities[right].1 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "{} and {} share the same VM identity",
                        vm_identities[left].0.as_str(),
                        vm_identities[right].0.as_str()
                    ),
                ));
            }
            if windows_identities[left].1 == windows_identities[right].1 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "{} and {} share the same Windows identity",
                        windows_identities[left].0.as_str(),
                        windows_identities[right].0.as_str()
                    ),
                ));
            }
        }
    }

    for index in 0..ClientId::VIRTUAL.len() {
        write_verified_client_identities(
            ClientId::VIRTUAL[index],
            &identity_fingerprint(&vm_identities[index].1),
            &windows_identities[index].1,
        )?;
    }

    let working_sets = provider.host_working_sets_mb()?;
    let mut result = Vec::with_capacity(3);
    for (client, _) in guests {
        result.push(client_status(
            provider,
            &working_sets,
            native.as_ref(),
            client,
        )?);
    }
    Ok(result)
}

fn require_verified_vm_identity(provider: &dyn Provider, client: ClientId) -> io::Result<()> {
    let Some(expected_vm_identity) = load_client_profile(client)
        .ok()
        .and_then(|profile| profile.verified_vm_identity)
    else {
        return Ok(());
    };

    let current_vm_identity = provider.identity_key(client)?.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("{} VM identity is unavailable", client.as_str()),
        )
    })?;
    if identity_fingerprint(&current_vm_identity) != expected_vm_identity {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "{} VM identity changed after verification; reprovision or run verify-identities after resolving the identity change",
                client.as_str()
            ),
        ));
    }

    Ok(())
}

fn require_verified_identity_provenance(
    provider: &dyn Provider,
    client: ClientId,
) -> io::Result<()> {
    let profile = require_client_matches_native(client)?;
    let expected_vm = profile.verified_vm_identity.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            format!(
                "{} identity proof is missing. Run start 3 then verify-identities before set-ready.",
                client.as_str()
            ),
        )
    })?;
    if profile.verified_windows_identity.is_none() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!(
                "{} Windows identity proof is missing. Run start 3 then verify-identities before set-ready.",
                client.as_str()
            ),
        ));
    }

    let current_vm = provider.identity_key(client)?.ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("{} VM identity is unavailable", client.as_str()),
        )
    })?;
    if identity_fingerprint(&current_vm) != expected_vm {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "{} VM identity changed after verification. Run verify-identities again.",
                client.as_str()
            ),
        ));
    }

    Ok(())
}

fn working_set_for(working_sets: &[(ClientId, u64)], client: ClientId) -> Option<u64> {
    working_sets
        .iter()
        .find_map(|(candidate, memory_mb)| (*candidate == client).then_some(*memory_mb))
}

fn client_status(
    provider: &dyn Provider,
    working_sets: &[(ClientId, u64)],
    native: Option<&MinecraftProfile>,
    client: ClientId,
) -> io::Result<ClientStatus> {
    let state = provider.status(client)?;
    if state == ClientState::NotProvisioned {
        return Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state,
            ready_snapshot: Some(false),
            memory_limit_mb: None,
            host_working_set_mb: None,
            guest_tools_ready: None,
            guest_agent_ready: None,
            guest_agent_version: None,
            minecraft_version: None,
            lineage_parity: Some(ProfileParity::Unknown),
            version_parity: Some(ProfileParity::Unknown),
            vm_identity: Some(IdentityState::Unknown),
            windows_identity: Some(IdentityState::Unknown),
        });
    }

    let guest = if state == ClientState::Running {
        guest_status_once(provider, client)
    } else {
        None
    };
    let minecraft_version = guest
        .as_ref()
        .and_then(|status| status.minecraft.as_ref())
        .map(|minecraft| minecraft.version.clone());
    let parity = version_parity(native, guest.as_ref());

    Ok(ClientStatus {
        id: client.as_str(),
        native: false,
        state,
        ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
        memory_limit_mb: provider.memory_limit_mb(client).ok(),
        host_working_set_mb: working_set_for(working_sets, client),
        guest_tools_ready: provider.guest_tools_ready(client).ok().flatten(),
        guest_agent_ready: Some(guest.is_some()),
        guest_agent_version: guest.as_ref().map(|status| status.agent_version.clone()),
        minecraft_version,
        lineage_parity: Some(lineage_parity(native, client)),
        version_parity: Some(parity),
        vm_identity: Some(vm_identity_state(provider, client)),
        windows_identity: Some(windows_identity_state(provider, client, guest.as_ref())),
    })
}

impl VirtualClients {
    pub fn doctor(&self) -> DoctorReport {
        doctor()
    }

    pub fn policy(&self) -> EnginePolicy {
        engine_policy()
    }

    fn record<T>(
        &self,
        operation: OperationKind,
        target: Option<String>,
        result: io::Result<T>,
    ) -> io::Result<T> {
        record_operation(operation, target, &result);
        result
    }

    pub fn stage_update(&self) -> io::Result<StagedUpdate> {
        self.record(OperationKind::StageUpdate, None, self.stage_update_inner())
    }

    pub fn register_base(&self) -> io::Result<BaseProfile> {
        self.record(OperationKind::RegisterBase, None, self.register_base_inner())
    }

    pub fn provision(&self) -> io::Result<Vec<ClientStatus>> {
        self.record(OperationKind::Provision, None, self.provision_inner())
    }

    pub fn reprovision(
        &self,
        client: ClientId,
        confirmation: DestructiveConfirmation,
    ) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Reprovision,
            Some(client.as_str().to_string()),
            self.reprovision_inner(client, confirmation),
        )
    }

    pub fn verify_identities(&self) -> io::Result<Vec<ClientStatus>> {
        self.record(
            OperationKind::VerifyIdentities,
            None,
            self.verify_identities_inner(),
        )
    }

    pub fn start(&self, count: usize) -> io::Result<Vec<ClientStatus>> {
        self.record(
            OperationKind::Start,
            Some(format!("count:{count}")),
            self.start_inner(count),
        )
    }

    pub fn suspend(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        let target = client
            .map(|client| client.as_str().to_string())
            .or_else(|| Some("all".to_string()));
        self.record(OperationKind::Suspend, target, self.suspend_inner(client))
    }

    pub fn stop(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        let target = client
            .map(|client| client.as_str().to_string())
            .or_else(|| Some("all".to_string()));
        self.record(OperationKind::Stop, target, self.stop_inner(client))
    }

    pub fn restart(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Restart,
            Some(client.as_str().to_string()),
            self.restart_inner(client),
        )
    }

    pub fn set_ready(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::SetReady,
            Some(client.as_str().to_string()),
            self.set_ready_inner(client),
        )
    }

    pub fn reset(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Reset,
            Some(client.as_str().to_string()),
            self.reset_inner(client),
        )
    }

    pub fn open(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Open,
            Some(client.as_str().to_string()),
            self.open_inner(client),
        )
    }

    pub fn check_update(&self) -> io::Result<UpdateCheck> {
        check_update()
    }

    fn stage_update_inner(&self) -> io::Result<StagedUpdate> {
        stage_update()
    }

    pub fn diagnostics(&self) -> io::Result<DiagnosticsReport> {
        let _lock = OperationLock::acquire_shared()?;
        collect_diagnostics(self.status_unlocked()?)
    }

    pub fn snapshot(&self) -> io::Result<EngineSnapshot> {
        let _lock = OperationLock::acquire_shared()?;
        let captured_at_unix_ms = capture_time_ms()?;
        let runtime = self.status_unlocked()?;
        let diagnostics = collect_diagnostics(runtime)?;
        Ok(EngineSnapshot {
            captured_at_unix_ms,
            doctor: self.doctor(),
            diagnostics,
        })
    }

    pub fn support_bundle(&self) -> io::Result<SupportBundleResult> {
        write_support_bundle(self.snapshot()?)
    }

    fn register_base_inner(&self) -> io::Result<BaseProfile> {
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        let native = native_minecraft_profile().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "Native Minecraft Education version could not be detected",
            )
        })?;
        let base = current_base_vmx_path()?;
        if !base.is_file() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Base VM is missing: {}", base.display()),
            ));
        }
        if provider.is_running_path(&base)? {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Base must be stopped before live verification",
            ));
        }

        match base_state_for_path(&base)? {
            Some(BaseState::Finalized) => {
                return Err(io::Error::new(
                    io::ErrorKind::AlreadyExists,
                    "Base is already FINALIZED and must not be booted for re-registration",
                ))
            }
            Some(BaseState::Finalizing) => {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "Base is in FINALIZING state; inspect the Base before continuing",
                ))
            }
            _ => {}
        }

        let token = ensure_guest_token_for_path(&base)?;
        provider.start_validation_vm(&base)?;

        let proof = (|| -> io::Result<GuestStatus> {
            let started = std::time::Instant::now();
            loop {
                if let Some(ip) = provider.guest_ip_for_path(&base)? {
                    match query_guest_status(&ip, &token, Duration::from_secs(2)) {
                        Ok(status) => {
                            if status.agent_version != env!("CARGO_PKG_VERSION") {
                                return Err(io::Error::new(
                                    io::ErrorKind::InvalidData,
                                    format!(
                                        "Base Guest Agent version {} does not match backend {}",
                                        status.agent_version,
                                        env!("CARGO_PKG_VERSION")
                                    ),
                                ));
                            }

                            let minecraft = status.minecraft.as_ref().ok_or_else(|| {
                                io::Error::new(
                                    io::ErrorKind::NotFound,
                                    "Base Guest Agent cannot detect Minecraft Education",
                                )
                            })?;
                            if minecraft.version != native.version {
                                return Err(io::Error::new(
                                    io::ErrorKind::InvalidData,
                                    format!(
                                        "Base Minecraft Education version {} does not match Native {}",
                                        minecraft.version, native.version
                                    ),
                                ));
                            }
                            return Ok(status);
                        }
                        Err(error) if guest_probe_error_is_terminal(&error) => {
                            return Err(io::Error::new(
                                error.kind(),
                                format!("Base Guest Agent probe failed: {error}"),
                            ));
                        }
                        Err(_) => {}
                    }
                }

                if started.elapsed() >= Duration::from_secs(120) {
                    return Err(io::Error::new(
                        io::ErrorKind::TimedOut,
                        "Base Guest Agent did not become ready within 120s",
                    ));
                }
                thread::sleep(Duration::from_secs(1));
            }
        })();

        let stop_result = provider.stop_validation_vm(&base);

        let proof = match (proof, stop_result) {
            (Ok(proof), Ok(())) => proof,
            (Err(error), Ok(())) => return Err(error),
            (Ok(_), Err(stop_error)) => {
                return Err(io::Error::new(
                    stop_error.kind(),
                    format!("Base proof succeeded but Base could not be stopped: {stop_error}"),
                ))
            }
            (Err(proof_error), Err(stop_error)) => {
                return Err(io::Error::new(
                    proof_error.kind(),
                    format!("{proof_error}; Base stop also failed: {stop_error}"),
                ))
            }
        };

        set_base_state_for_path(&base, BaseState::Registered)?;
        write_verified_base_profile(&native, &proof.agent_version)
    }

    fn provision_inner(&self) -> io::Result<Vec<ClientStatus>> {
        let profile = require_base_matches_native()?;
        let native = profile.native.ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "Native Minecraft Education version could not be detected",
            )
        })?;
        let base = current_base_vmx_path()?;
        if base_state_for_path(&base)? != Some(BaseState::Finalized) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Base must be FINALIZED with finalize-base.ps1 before provisioning",
            ));
        }

        let _lock = OperationLock::acquire()?;
        cleanup_staging()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        for client in ClientId::VIRTUAL {
            let previous = provider.status(client)?;
            provider.provision(client)?;
            if previous == ClientState::NotProvisioned {
                write_client_profile(client, &native.version)?;
            }
        }

        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        let mut result = Vec::with_capacity(3);
        for client in ClientId::VIRTUAL {
            result.push(client_status(
                provider.as_ref(),
                &working_sets,
                native_profile.as_ref(),
                client,
            )?);
        }
        Ok(result)
    }

    fn reprovision_inner(
        &self,
        client: ClientId,
        confirmation: DestructiveConfirmation,
    ) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native cannot be reprovisioned",
            ));
        }
        if confirmation != DestructiveConfirmation::ReprovisionAccountState {
            return Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "reprovision requires explicit account-state destruction confirmation",
            ));
        }

        let profile = require_base_matches_native()?;
        let native = profile.native.ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "Native Minecraft Education version could not be detected",
            )
        })?;
        let base = current_base_vmx_path()?;
        if base_state_for_path(&base)? != Some(BaseState::Finalized) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Base must be FINALIZED with finalize-base.ps1 before reprovisioning",
            ));
        }

        let _lock = OperationLock::acquire()?;
        cleanup_staging()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        validate_lifecycle_action(
            client,
            LifecycleAction::Reprovision,
            provider.status(client)?,
            provider.has_ready(client).unwrap_or(false),
        )?;

        provider.reprovision(client)?;
        write_client_profile(client, &native.version)?;
        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        client_status(
            provider.as_ref(),
            &working_sets,
            native_profile.as_ref(),
            client,
        )
    }

    fn verify_identities_inner(&self) -> io::Result<Vec<ClientStatus>> {
        require_base_matches_native()?;
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        verify_identity_provenance(provider.as_ref())
    }

    pub fn status(&self) -> io::Result<RuntimeStatus> {
        let _lock = OperationLock::acquire_shared()?;
        self.status_unlocked()
    }

    fn status_unlocked(&self) -> io::Result<RuntimeStatus> {
        let provider = current_platform_provider();
        let mut clients = Vec::with_capacity(ClientId::ALL.len());

        let native_profile = native_minecraft_profile();
        clients.push(ClientStatus {
            id: ClientId::Native.as_str(),
            native: true,
            state: ClientState::Manual,
            ready_snapshot: None,
            memory_limit_mb: None,
            host_working_set_mb: None,
            guest_tools_ready: None,
            guest_agent_ready: None,
            guest_agent_version: None,
            minecraft_version: native_profile
                .as_ref()
                .map(|profile| profile.version.clone()),
            lineage_parity: None,
            version_parity: None,
            vm_identity: None,
            windows_identity: None,
        });

        if let Some(provider) = provider.as_ref() {
            let working_sets = provider.host_working_sets_mb()?;
            for client in ClientId::VIRTUAL {
                clients.push(client_status(
                    provider.as_ref(),
                    &working_sets,
                    native_profile.as_ref(),
                    client,
                )?);
            }
        } else {
            for client in ClientId::VIRTUAL {
                clients.push(ClientStatus {
                    id: client.as_str(),
                    native: false,
                    state: ClientState::Error,
                    ready_snapshot: Some(false),
                    memory_limit_mb: None,
                    host_working_set_mb: None,
                    guest_tools_ready: None,
                    guest_agent_ready: None,
                    guest_agent_version: None,
                    minecraft_version: None,
                    lineage_parity: Some(ProfileParity::Unknown),
                    version_parity: Some(ProfileParity::Unknown),
                    vm_identity: Some(IdentityState::Unknown),
                    windows_identity: Some(IdentityState::Unknown),
                });
            }
        }

        Ok(RuntimeStatus {
            provider: provider.as_ref().map(|provider| provider.id()),
            runtime_profile: profile_status(),
            pressure: current_host_pressure(),
            clients,
        })
    }

    pub fn resources(&self, count: usize) -> io::Result<ResourceView> {
        if !(1..=MAX_VIRTUAL_CLIENTS).contains(&count) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "virtual client count must be within the configured engine policy",
            ));
        }

        let _lock = OperationLock::acquire_shared()?;
        let host = doctor();

        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let mut running = 0;
        let mut suspended = 0;
        let mut stopped = 0;
        let working_sets = provider.host_working_sets_mb()?;
        let mut observed_working_set_mb = 0;
        let mut observed_working_set_instances = 0;

        for client in ClientId::VIRTUAL.into_iter().take(count) {
            match provider.status(client)? {
                ClientState::Running => running += 1,
                ClientState::Suspended => suspended += 1,
                ClientState::Stopped => stopped += 1,
                ClientState::NotProvisioned => {
                    return Err(io::Error::new(
                        io::ErrorKind::NotFound,
                        format!("{} is not provisioned", client.as_str()),
                    ));
                }
                _ => {
                    return Err(io::Error::new(
                        io::ErrorKind::Other,
                        format!("{} is not in a resource-manageable state", client.as_str()),
                    ));
                }
            }

            if let Some(memory_mb) = working_set_for(&working_sets, client) {
                observed_working_set_mb += memory_mb;
                observed_working_set_instances += 1;
            }
        }

        Ok(ResourceView {
            requested_virtual_clients: count,
            recommended_virtual_clients: host.max_recommended_virtual_clients,
            running_virtual_clients: running,
            suspended_virtual_clients: suspended,
            stopped_virtual_clients: stopped,
            virtual_memory_limit_mb: VIRTUAL_MEMORY_LIMIT_MB,
            observed_working_set_mb,
            observed_working_set_instances,
            pressure: current_host_pressure(),
        })
    }

    fn start_inner(&self, count: usize) -> io::Result<Vec<ClientStatus>> {
        let resources = self.resources(count)?;
        require_base_matches_native()?;
        let inactive = resources.suspended_virtual_clients + resources.stopped_virtual_clients;

        if inactive > 0 && !resources.pressure.can_start_virtual {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!(
                    "host memory pressure is {:?}; suspend another Virtual or free host memory before starting more instances",
                    resources.pressure.level
                ),
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let targets: Vec<ClientId> = ClientId::VIRTUAL.into_iter().take(count).collect();
        let native_profile = native_minecraft_profile();
        let mut result = Vec::with_capacity(count);
        let mut started_by_batch: Vec<(ClientId, ClientState)> = Vec::new();

        for (index, client) in targets.into_iter().enumerate() {
            require_client_matches_native(client)?;
            require_verified_vm_identity(provider.as_ref(), client)?;
            let original_state = provider.status(client)?;
            validate_lifecycle_action(client, LifecycleAction::Start, original_state, false)?;

            if original_state != ClientState::Running {
                let live_pressure = current_host_pressure();
                if !live_pressure.can_start_virtual {
                    let rollback_failed = restore_batch_state(provider.as_ref(), &started_by_batch);
                    let error = io::Error::new(
                        io::ErrorKind::Other,
                        format!(
                            "host memory pressure became {:?} before starting {}",
                            live_pressure.level,
                            client.as_str()
                        ),
                    );
                    return Err(with_rollback_context(error, &rollback_failed));
                }
            }

            if vm_identity_state(provider.as_ref(), client) == IdentityState::Duplicate {
                let rollback_failed = restore_batch_state(provider.as_ref(), &started_by_batch);
                let error = io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("{} has duplicate VM identity", client.as_str()),
                );
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if let Err(error) = provider.start(client) {
                let rollback_failed = restore_batch_state(provider.as_ref(), &started_by_batch);
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if original_state != ClientState::Running {
                started_by_batch.push((client, original_state));
            }

            if vm_identity_state(provider.as_ref(), client) == IdentityState::Duplicate {
                let mut rollback_failed = Vec::new();
                if provider.stop(client).is_err() {
                    rollback_failed.push(client.as_str());
                }
                started_by_batch.retain(|(started, _)| *started != client);
                rollback_failed.extend(restore_batch_state(provider.as_ref(), &started_by_batch));
                let error = io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "{} received duplicate VM identity after start",
                        client.as_str()
                    ),
                );
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if let Err(error) = wait_for_guest_compatibility(
                provider.as_ref(),
                client,
                Duration::from_secs(90),
                true,
            ) {
                if original_state == ClientState::Running {
                    return Err(error);
                }

                let mut rollback_failed = Vec::new();
                if provider.stop(client).is_err() {
                    rollback_failed.push(client.as_str());
                }
                started_by_batch.retain(|(started, _)| *started != client);
                rollback_failed.extend(restore_batch_state(provider.as_ref(), &started_by_batch));
                return Err(with_rollback_context(error, &rollback_failed));
            }

            let working_sets = provider.host_working_sets_mb()?;
            result.push(client_status(
                provider.as_ref(),
                &working_sets,
                native_profile.as_ref(),
                client,
            )?);

            if index + 1 < count {
                let delay = start_delay_secs(current_host_pressure().level);
                thread::sleep(Duration::from_secs(delay));
            }
        }

        Ok(result)
    }

    fn suspend_inner(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        if client.is_some_and(ClientId::is_native) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native cannot be suspended by Virtual Clients",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let targets: Vec<ClientId> = match client {
            Some(client) => vec![client],
            None => ClientId::VIRTUAL
                .into_iter()
                .filter(|client| provider.status(*client).ok() != Some(ClientState::NotProvisioned))
                .collect(),
        };

        let mut suspended_by_batch = Vec::new();
        let mut result = Vec::with_capacity(targets.len());

        for client in &targets {
            let client = *client;
            let original_state = provider.status(client)?;
            validate_lifecycle_action(client, LifecycleAction::Suspend, original_state, false)?;
            if let Err(error) = provider.suspend(client) {
                let mut rollback_failed = Vec::new();
                for suspended in suspended_by_batch.into_iter().rev() {
                    if provider.start(suspended).is_err() {
                        rollback_failed.push(suspended.as_str());
                    }
                }
                return Err(with_rollback_context(error, &rollback_failed));
            }

            if original_state == ClientState::Running {
                suspended_by_batch.push(client);
            }
        }

        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        for client in targets {
            result.push(client_status(
                provider.as_ref(),
                &working_sets,
                native_profile.as_ref(),
                client,
            )?);
        }
        Ok(result)
    }

    fn stop_inner(&self, client: Option<ClientId>) -> io::Result<Vec<ClientStatus>> {
        if client.is_some_and(ClientId::is_native) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native lifecycle is managed manually on the host",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        let targets: Vec<ClientId> = match client {
            Some(client) => vec![client],
            None => ClientId::VIRTUAL
                .into_iter()
                .filter(|client| provider.status(*client).ok() != Some(ClientState::NotProvisioned))
                .collect(),
        };

        let mut result = Vec::with_capacity(targets.len());
        for client in &targets {
            let state = provider.status(*client)?;
            validate_lifecycle_action(*client, LifecycleAction::Stop, state, false)?;
            provider.stop(*client)?;
        }

        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        for client in targets {
            result.push(client_status(
                provider.as_ref(),
                &working_sets,
                native_profile.as_ref(),
                client,
            )?);
        }
        Ok(result)
    }

    fn restart_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native cannot be VM-restarted",
            ));
        }

        require_base_matches_native()?;
        require_client_matches_native(client)?;

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        require_verified_vm_identity(provider.as_ref(), client)?;
        validate_lifecycle_action(
            client,
            LifecycleAction::Restart,
            provider.status(client)?,
            provider.has_ready(client).unwrap_or(false),
        )?;
        provider.restart(client)?;
        if let Err(error) =
            wait_for_guest_compatibility(provider.as_ref(), client, Duration::from_secs(90), true)
        {
            let failed = if provider.stop(client).is_err() {
                vec![client.as_str()]
            } else {
                Vec::new()
            };
            return Err(with_rollback_context(error, &failed));
        }
        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        client_status(
            provider.as_ref(),
            &working_sets,
            native_profile.as_ref(),
            client,
        )
    }

    fn set_ready_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native does not use QA_READY snapshots",
            ));
        }

        require_base_matches_native()?;
        require_client_matches_native(client)?;

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        require_verified_identity_provenance(provider.as_ref(), client)?;
        validate_lifecycle_action(
            client,
            LifecycleAction::SetReady,
            provider.status(client)?,
            provider.has_ready(client)?,
        )?;
        provider.set_ready(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        client_status(
            provider.as_ref(),
            &working_sets,
            native_profile.as_ref(),
            client,
        )
    }

    fn reset_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native does not use VM clean-state reset",
            ));
        }

        require_base_matches_native()?;
        require_client_matches_native(client)?;

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        require_verified_vm_identity(provider.as_ref(), client)?;
        validate_lifecycle_action(
            client,
            LifecycleAction::Reset,
            provider.status(client)?,
            provider.has_ready(client)?,
        )?;
        provider.reset(client)?;
        if let Err(error) =
            wait_for_guest_compatibility(provider.as_ref(), client, Duration::from_secs(90), true)
        {
            let failed = if provider.stop(client).is_err() {
                vec![client.as_str()]
            } else {
                Vec::new()
            };
            return Err(with_rollback_context(error, &failed));
        }
        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        client_status(
            provider.as_ref(),
            &working_sets,
            native_profile.as_ref(),
            client,
        )
    }

    fn open_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native is opened manually on the host",
            ));
        }

        require_base_matches_native()?;
        require_client_matches_native(client)?;

        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        validate_lifecycle_action(
            client,
            LifecycleAction::Open,
            provider.status(client)?,
            false,
        )?;
        provider.open(client)?;
        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        client_status(
            provider.as_ref(),
            &working_sets,
            native_profile.as_ref(),
            client,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::{
        classify_identity_state, guest_probe_error_is_terminal, restore_batch_state,
        validate_lifecycle_action, vm_identity_state, LifecycleAction,
    };
    use crate::{
        client::{ClientId, ClientState, IdentityState},
        provider::Provider,
    };
    use std::{cell::RefCell, io, path::Path};

    #[derive(Debug)]
    struct FakeProvider {
        states: RefCell<[ClientState; 3]>,
        identities: [Option<&'static str>; 3],
        fail_start: Option<ClientId>,
        fail_stop: Option<ClientId>,
        fail_suspend: Option<ClientId>,
        identity_error: Option<ClientId>,
    }

    impl FakeProvider {
        fn new(states: [ClientState; 3], identities: [Option<&'static str>; 3]) -> Self {
            Self {
                states: RefCell::new(states),
                identities,
                fail_start: None,
                fail_stop: None,
                fail_suspend: None,
                identity_error: None,
            }
        }

        fn index(client: ClientId) -> io::Result<usize> {
            match client {
                ClientId::Virtual01 => Ok(0),
                ClientId::Virtual02 => Ok(1),
                ClientId::Virtual03 => Ok(2),
                ClientId::Native => Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "Native has no provider state",
                )),
            }
        }

        fn state(&self, client: ClientId) -> io::Result<ClientState> {
            Ok(self.states.borrow()[Self::index(client)?])
        }

        fn set_state(&self, client: ClientId, state: ClientState) -> io::Result<ClientState> {
            self.states.borrow_mut()[Self::index(client)?] = state;
            Ok(state)
        }

        fn unsupported<T>() -> io::Result<T> {
            Err(io::Error::new(
                io::ErrorKind::Unsupported,
                "not used by runtime simulation",
            ))
        }
    }

    impl Provider for FakeProvider {
        fn id(&self) -> &'static str {
            "fake"
        }

        fn version(&self) -> Option<String> {
            Some("test".into())
        }

        fn detect(&self) -> bool {
            true
        }

        fn provision(&self, _client: ClientId) -> io::Result<ClientState> {
            Self::unsupported()
        }

        fn reprovision(&self, _client: ClientId) -> io::Result<ClientState> {
            Self::unsupported()
        }

        fn memory_limit_mb(&self, _client: ClientId) -> io::Result<u64> {
            Ok(4096)
        }

        fn guest_tools_ready(&self, _client: ClientId) -> io::Result<Option<bool>> {
            Ok(Some(true))
        }

        fn guest_ip_address(&self, _client: ClientId) -> io::Result<Option<String>> {
            Ok(None)
        }

        fn identity_key(&self, client: ClientId) -> io::Result<Option<String>> {
            if self.identity_error == Some(client) {
                return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "injected identity read failure",
                ));
            }
            Ok(self.identities[Self::index(client)?].map(str::to_string))
        }

        fn status(&self, client: ClientId) -> io::Result<ClientState> {
            self.state(client)
        }

        fn start(&self, client: ClientId) -> io::Result<ClientState> {
            if self.fail_start == Some(client) {
                return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "injected start failure",
                ));
            }
            self.set_state(client, ClientState::Running)
        }

        fn suspend(&self, client: ClientId) -> io::Result<ClientState> {
            if self.fail_suspend == Some(client) {
                return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "injected suspend failure",
                ));
            }
            self.set_state(client, ClientState::Suspended)
        }

        fn stop(&self, client: ClientId) -> io::Result<ClientState> {
            if self.fail_stop == Some(client) {
                return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "injected stop failure",
                ));
            }
            self.set_state(client, ClientState::Stopped)
        }

        fn restart(&self, client: ClientId) -> io::Result<ClientState> {
            self.set_state(client, ClientState::Running)
        }

        fn set_ready(&self, client: ClientId) -> io::Result<ClientState> {
            self.state(client)
        }

        fn has_ready(&self, _client: ClientId) -> io::Result<bool> {
            Ok(false)
        }

        fn reset(&self, client: ClientId) -> io::Result<ClientState> {
            self.set_state(client, ClientState::Running)
        }

        fn open(&self, client: ClientId) -> io::Result<ClientState> {
            self.state(client)
        }

        fn is_running_path(&self, _vmx: &Path) -> io::Result<bool> {
            Self::unsupported()
        }

        fn start_validation_vm(&self, _vmx: &Path) -> io::Result<()> {
            Self::unsupported()
        }

        fn stop_validation_vm(&self, _vmx: &Path) -> io::Result<()> {
            Self::unsupported()
        }

        fn guest_ip_for_path(&self, _vmx: &Path) -> io::Result<Option<String>> {
            Self::unsupported()
        }
    }

    #[test]
    fn guest_probe_protocol_errors_fail_fast() {
        for kind in [
            io::ErrorKind::InvalidData,
            io::ErrorKind::InvalidInput,
            io::ErrorKind::PermissionDenied,
            io::ErrorKind::Other,
        ] {
            assert!(guest_probe_error_is_terminal(&io::Error::new(
                kind, "terminal"
            )));
        }

        for kind in [
            io::ErrorKind::TimedOut,
            io::ErrorKind::ConnectionRefused,
            io::ErrorKind::WouldBlock,
            io::ErrorKind::NotConnected,
        ] {
            assert!(!guest_probe_error_is_terminal(&io::Error::new(
                kind, "retry"
            )));
        }
    }

    #[test]
    fn vm_identity_classification_is_fail_closed() {
        assert_eq!(
            classify_identity_state(Some("vm-a"), [Some("vm-b"), Some("vm-c")]),
            IdentityState::Unique
        );
        assert_eq!(
            classify_identity_state(Some("vm-a"), [Some("vm-a"), Some("vm-c")]),
            IdentityState::Duplicate
        );
        assert_eq!(
            classify_identity_state(Some("vm-a"), [Some("vm-b"), None]),
            IdentityState::Unknown
        );
        assert_eq!(
            classify_identity_state(None, [Some("vm-b"), Some("vm-c")]),
            IdentityState::Unknown
        );
    }

    #[test]
    fn lifecycle_matrix_rejects_illegal_transitions_without_provider_mutation() {
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Start,
            ClientState::Stopped,
            false,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Start,
            ClientState::NotProvisioned,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Suspend,
            ClientState::Running,
            false,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Suspend,
            ClientState::Stopped,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Stop,
            ClientState::Suspended,
            false,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Stop,
            ClientState::NotProvisioned,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Open,
            ClientState::Stopped,
            false,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Open,
            ClientState::Error,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Restart,
            ClientState::Running,
            false,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Restart,
            ClientState::Stopped,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::SetReady,
            ClientState::Stopped,
            false,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::SetReady,
            ClientState::Stopped,
            true,
        )
        .is_err());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::SetReady,
            ClientState::Suspended,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Reset,
            ClientState::Running,
            true,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Reset,
            ClientState::Stopped,
            false,
        )
        .is_err());

        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Reprovision,
            ClientState::Stopped,
            true,
        )
        .is_ok());
        assert!(validate_lifecycle_action(
            ClientId::Virtual01,
            LifecycleAction::Reprovision,
            ClientState::Suspended,
            true,
        )
        .is_err());
    }

    #[test]
    fn fake_provider_proves_identity_states_without_vmware() {
        let provider = FakeProvider::new(
            [
                ClientState::Stopped,
                ClientState::Stopped,
                ClientState::Stopped,
            ],
            [Some("vm-a"), Some("vm-b"), Some("vm-c")],
        );
        assert_eq!(
            vm_identity_state(&provider, ClientId::Virtual01),
            IdentityState::Unique
        );

        let duplicate = FakeProvider::new(
            [
                ClientState::Stopped,
                ClientState::Stopped,
                ClientState::Stopped,
            ],
            [Some("vm-a"), Some("vm-a"), Some("vm-c")],
        );
        assert_eq!(
            vm_identity_state(&duplicate, ClientId::Virtual01),
            IdentityState::Duplicate
        );

        let unreadable = FakeProvider {
            identity_error: Some(ClientId::Virtual02),
            ..FakeProvider::new(
                [
                    ClientState::Stopped,
                    ClientState::Stopped,
                    ClientState::Stopped,
                ],
                [Some("vm-a"), Some("vm-b"), Some("vm-c")],
            )
        };
        assert_eq!(
            vm_identity_state(&unreadable, ClientId::Virtual01),
            IdentityState::Unknown
        );
    }

    #[test]
    fn fake_provider_proves_batch_rollback_to_original_states() {
        let provider = FakeProvider::new(
            [
                ClientState::Running,
                ClientState::Running,
                ClientState::Stopped,
            ],
            [Some("vm-a"), Some("vm-b"), Some("vm-c")],
        );

        let failed = restore_batch_state(
            &provider,
            &[
                (ClientId::Virtual01, ClientState::Stopped),
                (ClientId::Virtual02, ClientState::Suspended),
            ],
        );

        assert!(failed.is_empty());
        assert_eq!(
            provider.state(ClientId::Virtual01).unwrap(),
            ClientState::Stopped
        );
        assert_eq!(
            provider.state(ClientId::Virtual02).unwrap(),
            ClientState::Suspended
        );
        assert_eq!(
            provider.state(ClientId::Virtual03).unwrap(),
            ClientState::Stopped
        );
    }

    #[test]
    fn fake_provider_surfaces_incomplete_rollback_without_touching_other_clients() {
        let provider = FakeProvider {
            fail_stop: Some(ClientId::Virtual01),
            ..FakeProvider::new(
                [
                    ClientState::Running,
                    ClientState::Running,
                    ClientState::Stopped,
                ],
                [Some("vm-a"), Some("vm-b"), Some("vm-c")],
            )
        };

        let failed = restore_batch_state(
            &provider,
            &[
                (ClientId::Virtual01, ClientState::Stopped),
                (ClientId::Virtual02, ClientState::Suspended),
            ],
        );

        assert_eq!(failed, vec!["Virtual-01"]);
        assert_eq!(
            provider.state(ClientId::Virtual01).unwrap(),
            ClientState::Running
        );
        assert_eq!(
            provider.state(ClientId::Virtual02).unwrap(),
            ClientState::Suspended
        );
        assert_eq!(
            provider.state(ClientId::Virtual03).unwrap(),
            ClientState::Stopped
        );
    }
}
