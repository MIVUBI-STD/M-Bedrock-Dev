use crate::{
    client::{
        ActionAvailability, ClientId, ClientLifecycleActions, ClientState, ClientStatus,
        DestructiveConfirmation, IdentityState, LifecycleBlocker,
    },
    diagnostics::{collect as collect_diagnostics, DiagnosticsReport},
    doctor::{doctor, DoctorReport},
    guest::{
        guest_agent_launch_compatible, guest_agent_protocol_compatible, launch_guest_minecraft,
        query_guest_status, GuestStatus, GUEST_AGENT_PROTOCOL_VERSION,
    },
    journal::{record_operation, OperationKind},
    lifecycle_admission::{
        evaluate_lifecycle_admission, require_lifecycle_admission, validate_power_state,
        LifecycleAction, LifecycleFacts,
    },
    paths::runtime_root,
    policy::{engine_policy, EnginePolicy, MAX_VIRTUAL_CLIENTS},
    profile::{
        client_lineage_parity, current_base_vmx_path, identity_fingerprint, load_base_profile,
        load_client_profile, native_minecraft_profile, profile_status,
        require_base_matches_native, require_client_matches_native, write_client_profile,
        write_verified_base_profile, write_verified_client_identities, BaseProfile, BaseState,
        MinecraftProfile, ProfileParity, ProfileStatus,
    },
    provider::{
        base_state_for_path, cleanup_staging, current_platform_provider,
        ensure_guest_token_for_path, guest_token, set_base_state_for_path, Provider,
    },
    resources::{current_host_pressure, start_delay_secs, HostPressure, VIRTUAL_MEMORY_LIMIT_MB},
    schema::{ensure_runtime_schema, inspect_runtime_schema, SchemaState},
    support::{capture_time_ms, write_support_bundle, EngineSnapshot, SupportBundleResult},
    update::{check_update, stage_update, StagedUpdate, UpdateCheck},
};
use fs2::FileExt;
use serde::Serialize;
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

fn require_base_finalization_state(state: Option<BaseState>) -> io::Result<()> {
    if state == Some(BaseState::Registered) {
        return Ok(());
    }
    Err(io::Error::new(
        io::ErrorKind::InvalidInput,
        "Base can be opened for finalization only while it is REGISTERED",
    ))
}

fn identity_components(value: &str) -> Option<(&str, &str)> {
    let (uuid, mac) = value.split_once('|')?;
    let (uuid, mac) = (uuid.trim(), mac.trim());
    (!uuid.is_empty() && !mac.is_empty() && !mac.contains('|')).then_some((uuid, mac))
}

fn classify_identity_state<'a>(
    current: Option<&'a str>,
    peers: impl IntoIterator<Item = Option<&'a str>>,
) -> IdentityState {
    let Some((uuid, mac)) = current.and_then(identity_components) else {
        return IdentityState::Unknown;
    };

    for peer in peers {
        let Some((peer_uuid, peer_mac)) = peer.and_then(identity_components) else {
            return IdentityState::Unknown;
        };
        if uuid.eq_ignore_ascii_case(peer_uuid) || mac.eq_ignore_ascii_case(peer_mac) {
            return IdentityState::Duplicate;
        }
    }

    IdentityState::Unique
}

#[derive(Debug, Clone)]
struct ClientObservation {
    client: ClientId,
    state: ClientState,
    vm_identity: Option<String>,
    guest: Option<GuestStatus>,
}

fn collect_client_observations(provider: &dyn Provider) -> io::Result<Vec<ClientObservation>> {
    ClientId::VIRTUAL
        .into_iter()
        .map(|client| {
            let state = provider.status(client)?;
            let vm_identity = if state == ClientState::NotProvisioned {
                None
            } else {
                provider.identity_key(client).ok().flatten()
            };
            let guest = (state == ClientState::Running)
                .then(|| guest_status_once(provider, client))
                .flatten();
            Ok(ClientObservation {
                client,
                state,
                vm_identity,
                guest,
            })
        })
        .collect()
}

fn observation_for(
    observations: &[ClientObservation],
    client: ClientId,
) -> io::Result<&ClientObservation> {
    observations
        .iter()
        .find(|observation| observation.client == client)
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("{} observation is missing", client.as_str()),
            )
        })
}

fn vm_identity_state_from_observations(
    client: ClientId,
    observations: &[ClientObservation],
) -> IdentityState {
    let Ok(current) = observation_for(observations, client) else {
        return IdentityState::Unknown;
    };
    let mut peers = Vec::new();

    for other in observations {
        if other.client == client || other.state == ClientState::NotProvisioned {
            continue;
        }
        peers.push(other.vm_identity.as_deref());
    }

    classify_identity_state(current.vm_identity.as_deref(), peers)
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

fn collect_lifecycle_facts(provider: &dyn Provider, client: ClientId) -> io::Result<LifecycleFacts> {
    let state = provider.status(client)?;
    let ready_snapshot = if state == ClientState::NotProvisioned {
        Some(false)
    } else {
        provider.has_ready(client).ok()
    };
    let root = runtime_root()?;
    let schema_ready = matches!(
        inspect_runtime_schema(&root).state,
        SchemaState::Ready | SchemaState::Missing
    );
    let profile = profile_status();
    let client_profile = load_client_profile(client).ok();
    let current_vm = provider.identity_key(client).ok().flatten();
    let saved_vm_identity_matches = client_profile.as_ref().map_or(true, |profile| {
        profile.saved_vm_identity_matches(current_vm.as_deref())
    });
    let identity_verified = client_profile.as_ref().is_some_and(|profile| {
        profile.identity_provenance_matches(current_vm.as_deref())
    });
    let client_compatible = client_lineage_parity(
        profile.native.as_ref(),
        profile.base.as_ref(),
        client_profile.as_ref(),
        state != ClientState::NotProvisioned,
    ) == ProfileParity::Match;
    let base_finalized_and_stopped = current_base_vmx_path().ok().is_some_and(|path| {
        base_state_for_path(&path).ok().flatten() == Some(BaseState::Finalized)
            && provider.is_running_path(&path).ok() == Some(false)
    });

    let vm_identity = vm_identity_state(provider, client);
    let fresh_client_profile = client_profile.as_ref().is_some_and(|profile| {
        profile.verified_vm_identity.is_none() && profile.verified_windows_identity.is_none()
    });

    Ok(LifecycleFacts {
        state,
        ready_snapshot,
        schema_ready,
        base_compatible: profile.parity == ProfileParity::Match,
        client_compatible,
        saved_vm_identity_matches,
        vm_identity_duplicate: vm_identity == IdentityState::Duplicate,
        vm_identity_unique: vm_identity == IdentityState::Unique,
        fresh_client_profile,
        identity_verified,
        base_finalized_and_stopped,
        can_start: current_host_pressure().can_start_virtual,
    })
}

fn check_action_admission(
    provider: &dyn Provider,
    client: ClientId,
    action: LifecycleAction,
) -> io::Result<()> {
    require_lifecycle_admission(client, action, &collect_lifecycle_facts(provider, client)?)
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

// Shared by production startup and deterministic provider tests. Every failure
// after the first mutation follows the same rollback path, including failures
// in admission, compatibility verification, and result collection.
fn execute_start_batch<T>(
    provider: &dyn Provider,
    targets: &[ClientId],
    mut prepare: impl FnMut(ClientId, ClientState) -> io::Result<()>,
    mut verify: impl FnMut(ClientId) -> io::Result<T>,
) -> io::Result<Vec<T>> {
    let mut changed = Vec::with_capacity(targets.len());
    let outcome: io::Result<Vec<T>> = (|| {
        let mut results = Vec::with_capacity(targets.len());
        for &client in targets {
            let original_state = provider.status(client)?;
            validate_power_state(client, LifecycleAction::Start, original_state, false)?;
            prepare(client, original_state)?;

            if original_state != ClientState::Running {
                // A provider may mutate the VM before returning a timeout/error.
                // Record responsibility before calling it so that case is covered.
                changed.push((client, original_state));
                provider.start(client)?;
            }
            match verify(client) {
                Ok(result) => results.push(result),
                Err(error) => {
                    // A newly started/resumed client that fails verification
                    // must be stopped, not left live or saved as a bad resume.
                    // Earlier successful resumes still return to Suspended.
                    if original_state != ClientState::Running {
                        if let Some((_, rollback_state)) = changed.last_mut() {
                            *rollback_state = ClientState::Stopped;
                        }
                    }
                    return Err(error);
                }
            }
        }
        Ok(results)
    })();

    match outcome {
        Ok(results) => Ok(results),
        Err(error) => {
            let failed = restore_batch_state(provider, &changed);
            Err(with_rollback_context(error, &failed))
        }
    }
}

// Setup reuses startup rollback but intentionally does not probe a guest that
// may still be waiting for user input in Windows OOBE.
fn execute_setup_start(
    provider: &dyn Provider,
    client: ClientId,
    prepare: impl FnMut(ClientId, ClientState) -> io::Result<()>,
) -> io::Result<ClientState> {
    let mut states = execute_start_batch(provider, &[client], prepare, |client| provider.open(client))?;
    states.pop().ok_or_else(|| {
        io::Error::new(io::ErrorKind::Other, "first-time setup returned no client state")
    })
}

fn guest_status_once(provider: &dyn Provider, client: ClientId) -> Option<GuestStatus> {
    let ip = provider.guest_ip_address(client).ok().flatten()?;
    let token = guest_token(client).ok().flatten()?;
    query_guest_status(&ip, &token, Duration::from_secs(1)).ok()
}

fn ensure_minecraft_running(provider: &dyn Provider, client: ClientId) -> io::Result<()> {
    let ip = provider.guest_ip_address(client)?.ok_or_else(|| {
        io::Error::new(io::ErrorKind::AddrNotAvailable, format!("{} guest IP is unavailable", client.as_str()))
    })?;
    let token = guest_token(client)?.ok_or_else(|| {
        io::Error::new(io::ErrorKind::NotFound, format!("{} Guest Agent token is missing", client.as_str()))
    })?;
    let status = query_guest_status(&ip, &token, Duration::from_secs(2))?;
    if !guest_agent_launch_compatible(status.protocol_version) {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            format!(
                "{} Guest Agent protocol {} does not support Minecraft auto-launch; protocol {} is required",
                client.as_str(), status.protocol_version, GUEST_AGENT_PROTOCOL_VERSION
            ),
        ));
    }
    launch_guest_minecraft(&ip, &token, Duration::from_secs(35)).map(|_| ())
}

fn lineage_parity(native: Option<&MinecraftProfile>, client: ClientId) -> ProfileParity {
    let base = load_base_profile().ok();
    let client_profile = load_client_profile(client).ok();
    client_lineage_parity(
        native,
        base.as_ref(),
        client_profile.as_ref(),
        client_profile.is_some(),
    )
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

                    if !guest_agent_protocol_compatible(status.protocol_version) {
                        return Err(io::Error::new(
                            io::ErrorKind::InvalidData,
                            format!(
                                "{} Guest Agent protocol {} is incompatible with backend protocol {}",
                                client.as_str(),
                                status.protocol_version,
                                GUEST_AGENT_PROTOCOL_VERSION
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
    client: ClientId,
    observations: &[ClientObservation],
) -> IdentityState {
    let Ok(current) = observation_for(observations, client) else {
        return IdentityState::Unknown;
    };
    let Some(identity) = current
        .guest
        .as_ref()
        .and_then(|status| status.machine_identity.as_deref())
    else {
        return IdentityState::Unknown;
    };

    for other in observations {
        if other.client == client {
            continue;
        }
        if other.state != ClientState::Running {
            return IdentityState::Unknown;
        }
        let Some(other_identity) = other
            .guest
            .as_ref()
            .and_then(|status| status.machine_identity.as_deref())
        else {
            return IdentityState::Unknown;
        };
        if other_identity == identity {
            return IdentityState::Duplicate;
        }
    }

    IdentityState::Unique
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
            if classify_identity_state(
                Some(vm_identities[left].1.as_str()),
                [Some(vm_identities[right].1.as_str())],
            ) != IdentityState::Unique
            {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "{} and {} do not have independently unique VM UUID and MAC identities",
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

fn working_set_for(working_sets: &[(ClientId, u64)], client: ClientId) -> Option<u64> {
    working_sets
        .iter()
        .find_map(|(candidate, memory_mb)| (*candidate == client).then_some(*memory_mb))
}

fn client_status_from_observations(
    provider: &dyn Provider,
    working_sets: &[(ClientId, u64)],
    native: Option<&MinecraftProfile>,
    client: ClientId,
    observations: &[ClientObservation],
) -> io::Result<ClientStatus> {
    let observation = observation_for(observations, client)?;
    let state = observation.state;
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
            minecraft_running: None,
            interactive_launcher_ready: None,
            lineage_parity: Some(ProfileParity::Unknown),
            version_parity: Some(ProfileParity::Unknown),
            vm_identity: Some(IdentityState::Unknown),
            windows_identity: Some(IdentityState::Unknown),
        });
    }

    let guest = observation.guest.as_ref();
    let minecraft_version = guest
        .and_then(|status| status.minecraft.as_ref())
        .map(|minecraft| minecraft.version.clone());
    let parity = version_parity(native, guest);

    Ok(ClientStatus {
        id: client.as_str(),
        native: false,
        state,
        ready_snapshot: Some(provider.has_ready(client).unwrap_or(false)),
        memory_limit_mb: provider.memory_limit_mb(client).ok(),
        host_working_set_mb: working_set_for(working_sets, client),
        guest_tools_ready: provider.guest_tools_ready(client).ok().flatten(),
        guest_agent_ready: Some(guest.is_some()),
        guest_agent_version: guest.map(|status| status.agent_version.clone()),
        minecraft_version,
        minecraft_running: guest.and_then(|status| status.minecraft_running),
        interactive_launcher_ready: guest.and_then(|status| status.interactive_launcher_ready),
        lineage_parity: Some(lineage_parity(native, client)),
        version_parity: Some(parity),
        vm_identity: Some(vm_identity_state_from_observations(client, observations)),
        windows_identity: Some(windows_identity_state(client, observations)),
    })
}

fn client_status(
    provider: &dyn Provider,
    working_sets: &[(ClientId, u64)],
    native: Option<&MinecraftProfile>,
    client: ClientId,
) -> io::Result<ClientStatus> {
    let observations = collect_client_observations(provider)?;
    client_status_from_observations(provider, working_sets, native, client, &observations)
}

impl VirtualClients {
    pub fn doctor(&self) -> DoctorReport {
        doctor()
    }

    pub fn policy(&self) -> EnginePolicy {
        engine_policy()
    }

    pub fn lifecycle_actions(&self) -> io::Result<Vec<ClientLifecycleActions>> {
        let _lock = OperationLock::acquire_shared()?;
        let Some(provider) = current_platform_provider() else {
            return Ok(ClientId::VIRTUAL
                .into_iter()
                .map(|client| {
                    let blocked = || ActionAvailability {
                        allowed: false,
                        blocker: Some(LifecycleBlocker::ProviderUnavailable),
                        reason: Some("Virtualization provider is unavailable."),
                    };
                    ClientLifecycleActions {
                        id: client.as_str(),
                        start: blocked(),
                        start_setup: Some(blocked()),
                        suspend: blocked(),
                        stop: blocked(),
                        open: blocked(),
                        restart: blocked(),
                        set_ready: blocked(),
                        reset: blocked(),
                        reprovision: blocked(),
                    }
                })
                .collect());
        };

        ClientId::VIRTUAL
            .into_iter()
            .map(|client| {
                let facts = collect_lifecycle_facts(provider.as_ref(), client)?;
                let action = |kind| evaluate_lifecycle_admission(client, kind, &facts);
                Ok(ClientLifecycleActions {
                    id: client.as_str(),
                    start: action(LifecycleAction::Start),
                    start_setup: facts.fresh_client_profile.then(|| action(LifecycleAction::StartSetup)),
                    suspend: action(LifecycleAction::Suspend),
                    stop: action(LifecycleAction::Stop),
                    open: action(LifecycleAction::Open),
                    restart: action(LifecycleAction::Restart),
                    set_ready: action(LifecycleAction::SetReady),
                    reset: action(LifecycleAction::Reset),
                    reprovision: action(LifecycleAction::Reprovision),
                })
            })
            .collect()
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
        self.record(
            OperationKind::RegisterBase,
            None,
            self.register_base_inner(),
        )
    }

    pub fn open_base_for_finalization(&self) -> io::Result<()> {
        self.record(
            OperationKind::OpenBaseFinalization,
            Some("Base".to_string()),
            self.open_base_for_finalization_inner(),
        )
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

    pub fn start_setup(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Start,
            Some(format!("first-boot:{}", client.as_str())),
            self.start_setup_inner(client),
        )
    }

    pub fn start_client(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Start,
            Some(client.as_str().to_string()),
            self.start_client_inner(client),
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

    pub fn launch_minecraft(&self, client: ClientId) -> io::Result<ClientStatus> {
        self.record(
            OperationKind::Open,
            Some(format!("minecraft:{}", client.as_str())),
            self.launch_minecraft_inner(client),
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
                            if !guest_agent_protocol_compatible(status.protocol_version) {
                                return Err(io::Error::new(
                                    io::ErrorKind::InvalidData,
                                    format!(
                                        "Base Guest Agent protocol {} is incompatible with backend protocol {}",
                                        status.protocol_version,
                                        GUEST_AGENT_PROTOCOL_VERSION
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
        write_verified_base_profile(
            &native,
            &proof.agent_version,
            proof.protocol_version,
        )
    }

    fn open_base_for_finalization_inner(&self) -> io::Result<()> {
        require_base_matches_native()?;
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        let base = current_base_vmx_path()?;
        if !base.is_file() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Base VM is missing: {}", base.display()),
            ));
        }
        require_base_finalization_state(base_state_for_path(&base)?)?;

        provider.start_validation_vm(&base)?;
        if let Err(open_error) = provider.open_vm_ui(&base) {
            let stop_error = provider.stop_validation_vm(&base).err();
            return Err(io::Error::new(
                open_error.kind(),
                match stop_error {
                    Some(stop_error) => format!(
                        "Base started but VMware UI could not open: {open_error}; rollback stop also failed: {stop_error}"
                    ),
                    None => format!("VMware UI could not open for Base finalization: {open_error}"),
                },
            ));
        }

        Ok(())
    }

    fn provision_inner(&self) -> io::Result<Vec<ClientStatus>> {
        let profile = require_base_matches_native()?;
        let native = profile.native.ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "Native Minecraft Education version could not be detected",
            )
        })?;
        let base_generation_id = profile.base.as_ref().map(|base| base.base_generation_id.clone()).ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "registered Base generation is unavailable")
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
                write_client_profile(client, &native.version, &base_generation_id)?;
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
        let base_generation_id = profile.base.as_ref().map(|base| base.base_generation_id.clone()).ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "registered Base generation is unavailable")
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
        check_action_admission(provider.as_ref(), client, LifecycleAction::Reprovision)?;

        provider.reprovision(client)?;
        write_client_profile(client, &native.version, &base_generation_id)?;
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
            minecraft_running: None,
            interactive_launcher_ready: None,
            lineage_parity: None,
            version_parity: None,
            vm_identity: None,
            windows_identity: None,
        });

        if let Some(provider) = provider.as_ref() {
            let working_sets = provider.host_working_sets_mb()?;
            let observations = collect_client_observations(provider.as_ref())?;
            for client in ClientId::VIRTUAL {
                clients.push(client_status_from_observations(
                    provider.as_ref(),
                    &working_sets,
                    native_profile.as_ref(),
                    client,
                    &observations,
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
                    minecraft_running: None,
                    interactive_launcher_ready: None,
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
        if !(1..=MAX_VIRTUAL_CLIENTS).contains(&count) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "virtual client count must be within the configured engine policy",
            ));
        }
        let targets: Vec<ClientId> = ClientId::VIRTUAL.into_iter().take(count).collect();
        self.start_targets(targets)
    }

    fn start_client_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native lifecycle is managed manually on the host",
            ));
        }
        let mut result = self.start_targets(vec![client])?;
        result.pop().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::Other,
                "selected Virtual start returned no client status",
            )
        })
    }


    fn start_setup_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;
        check_action_admission(provider.as_ref(), client, LifecycleAction::StartSetup)?;
        // Reuse the same mutation/rollback owner. Missing Guest Agent during
        // interactive Windows first boot is not a failed daily-start verification.
        let state = execute_setup_start(provider.as_ref(), client, |client, _| {
            check_action_admission(provider.as_ref(), client, LifecycleAction::StartSetup)
        })?;
        // Return power observations only. Do not write identity provenance or
        // claim guest/version readiness before verify-identities completes.
        Ok(ClientStatus {
            id: client.as_str(),
            native: false,
            state,
            ready_snapshot: Some(false),
            memory_limit_mb: provider.memory_limit_mb(client).ok(),
            host_working_set_mb: None,
            guest_tools_ready: None,
            guest_agent_ready: None,
            guest_agent_version: None,
            minecraft_version: None,
            minecraft_running: None,
            interactive_launcher_ready: None,
            lineage_parity: Some(ProfileParity::Match),
            version_parity: Some(ProfileParity::Unknown),
            vm_identity: Some(vm_identity_state(provider.as_ref(), client)),
            windows_identity: Some(IdentityState::Unknown),
        })
    }

    fn start_targets(&self, targets: Vec<ClientId>) -> io::Result<Vec<ClientStatus>> {
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;

        // Preflight and live admission use the same policy as UI availability.
        for &client in &targets {
            check_action_admission(provider.as_ref(), client, LifecycleAction::Start)?;
        }

        let native_profile = native_minecraft_profile();
        let target_count = targets.len();
        let mut completed = 0;
        let statuses = execute_start_batch(
            provider.as_ref(),
            &targets,
            |client, _| {
                check_action_admission(provider.as_ref(), client, LifecycleAction::Start)
            },
            |client| {
                check_action_admission(provider.as_ref(), client, LifecycleAction::Start)?;
                wait_for_guest_compatibility(
                    provider.as_ref(),
                    client,
                    Duration::from_secs(90),
                    true,
                )?;
                let working_sets = provider.host_working_sets_mb()?;
                let status = client_status(
                    provider.as_ref(),
                    &working_sets,
                    native_profile.as_ref(),
                    client,
                )?;
                completed += 1;
                if completed < target_count {
                    thread::sleep(Duration::from_secs(start_delay_secs(
                        current_host_pressure().level,
                    )));
                }
                Ok(status)
            },
        )?;

        for (index, client) in targets.iter().enumerate() {
            if let Err(error) = ensure_minecraft_running(provider.as_ref(), *client) {
                return Err(io::Error::new(
                    error.kind(),
                    format!(
                        "{} is running, but Minecraft Education could not be opened: {error}",
                        client.as_str()
                    ),
                ));
            }
            if let Err(error) = provider.open(*client) {
                return Err(io::Error::new(
                    error.kind(),
                    format!(
                        "{} and Minecraft Education are running, but the client window could not be opened: {error}",
                        client.as_str()
                    ),
                ));
            }
            if index + 1 < targets.len() {
                thread::sleep(Duration::from_secs(start_delay_secs(current_host_pressure().level)));
            }
        }
        Ok(statuses)
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
            check_action_admission(provider.as_ref(), client, LifecycleAction::Suspend)?;
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
            check_action_admission(provider.as_ref(), *client, LifecycleAction::Stop)?;
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

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        check_action_admission(provider.as_ref(), client, LifecycleAction::Restart)?;
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
        if let Err(error) = ensure_minecraft_running(provider.as_ref(), client) {
            return Err(io::Error::new(
                error.kind(),
                format!("{} is running, but Minecraft Education could not be opened: {error}", client.as_str()),
            ));
        }
        if let Err(error) = provider.open(client) {
            return Err(io::Error::new(
                error.kind(),
                format!("{} and Minecraft Education are running, but the client window could not be opened: {error}", client.as_str()),
            ));
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

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        check_action_admission(provider.as_ref(), client, LifecycleAction::SetReady)?;
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

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        check_action_admission(provider.as_ref(), client, LifecycleAction::Reset)?;
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
        if let Err(error) = ensure_minecraft_running(provider.as_ref(), client) {
            return Err(io::Error::new(
                error.kind(),
                format!("{} is running, but Minecraft Education could not be opened: {error}", client.as_str()),
            ));
        }
        if let Err(error) = provider.open(client) {
            return Err(io::Error::new(
                error.kind(),
                format!("{} and Minecraft Education are running, but the client window could not be opened: {error}", client.as_str()),
            ));
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

    fn launch_minecraft_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "Native Minecraft is launched by the desktop app"));
        }
        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "virtualization provider is unavailable")
        })?;
        if provider.status(client)? != ClientState::Running {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "Virtual client must be running before Minecraft can be launched"));
        }
        ensure_minecraft_running(provider.as_ref(), client)?;
        let working_sets = provider.host_working_sets_mb()?;
        let native_profile = native_minecraft_profile();
        client_status(provider.as_ref(), &working_sets, native_profile.as_ref(), client)
    }

    fn open_inner(&self, client: ClientId) -> io::Result<ClientStatus> {
        if client.is_native() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Native is opened manually on the host",
            ));
        }

        let _lock = OperationLock::acquire()?;
        let provider = current_platform_provider().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "virtualization provider is unavailable",
            )
        })?;
        check_action_admission(provider.as_ref(), client, LifecycleAction::Open)?;
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
        vm_identity_state,
    };
    use crate::profile::BaseState;
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
        fail_after_start: bool,
        fail_open: bool,
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
                fail_after_start: false,
                fail_open: false,
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
                if self.fail_after_start {
                    self.set_state(client, ClientState::Running)?;
                }
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
            if self.fail_open {
                return Err(io::Error::new(io::ErrorKind::Other, "injected UI open failure"));
            }
            self.state(client)
        }

        fn open_vm_ui(&self, _vmx: &Path) -> io::Result<()> {
            Self::unsupported()
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
    fn selected_start_target_is_not_prefix_batch() {
        let selected = ClientId::Virtual02;
        let targets = vec![selected];
        assert_eq!(targets, vec![ClientId::Virtual02]);
        assert_ne!(
            targets,
            ClientId::VIRTUAL.into_iter().take(2).collect::<Vec<_>>()
        );
    }

    #[test]
    fn base_finalization_open_requires_registered_state() {
        assert!(super::require_base_finalization_state(Some(BaseState::Registered)).is_ok());
        assert!(super::require_base_finalization_state(Some(BaseState::Finalizing)).is_err());
        assert!(super::require_base_finalization_state(Some(BaseState::Finalized)).is_err());
        assert!(super::require_base_finalization_state(None).is_err());
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
            classify_identity_state(Some("uuid-a|mac-a"), [Some("uuid-b|mac-b"), Some("uuid-c|mac-c")]),
            IdentityState::Unique
        );
        assert_eq!(
            classify_identity_state(Some("uuid-a|mac-a"), [Some("uuid-a|mac-a"), Some("uuid-c|mac-c")]),
            IdentityState::Duplicate
        );
        assert_eq!(
            classify_identity_state(Some("uuid-a|mac-a"), [Some("uuid-b|mac-b"), None]),
            IdentityState::Unknown
        );
        assert_eq!(
            classify_identity_state(None, [Some("uuid-b|mac-b"), Some("uuid-c|mac-c")]),
            IdentityState::Unknown
        );
    }

    #[test]
    fn fake_provider_proves_identity_states_without_vmware() {
        let provider = FakeProvider::new(
            [
                ClientState::Stopped,
                ClientState::Stopped,
                ClientState::Stopped,
            ],
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
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
            [Some("uuid-a|mac-a"), Some("uuid-a|mac-a"), Some("uuid-c|mac-c")],
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
                [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
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
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
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
                [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
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
    #[test]
    fn vm_identity_rejects_a_collision_in_either_component() {
        for peer in ["uuid-b|mac-a", "uuid-a|mac-b", "UUID-A|MAC-B"] {
            assert_eq!(
                classify_identity_state(Some("uuid-a|mac-a"), [Some(peer)]),
                IdentityState::Duplicate
            );
        }
        assert_eq!(
            classify_identity_state(Some("uuid-a|mac-a"), [Some("uuid-b|mac-b")]),
            IdentityState::Unique
        );
        for invalid in ["missing-separator", "|mac-a", "uuid-a|", "a|b|c"] {
            assert_eq!(
                classify_identity_state(Some(invalid), [Some("uuid-b|mac-b")]),
                IdentityState::Unknown
            );
        }
    }

    fn stopped_provider() -> FakeProvider {
        FakeProvider::new(
            [ClientState::Stopped; 3],
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
        )
    }

    #[test]
    fn start_batch_rolls_back_when_later_admission_fails() {
        let provider = stopped_provider();
        let error = super::execute_start_batch(
            &provider,
            &ClientId::VIRTUAL,
            |client, _| {
                if client == ClientId::Virtual02 {
                    Err(io::Error::new(io::ErrorKind::InvalidData, "lineage changed"))
                } else {
                    Ok(())
                }
            },
            |client| provider.state(client),
        )
        .unwrap_err();
        assert!(error.to_string().contains("lineage changed"));
        assert_eq!(*provider.states.borrow(), [ClientState::Stopped; 3]);
    }

    #[test]
    fn start_batch_rolls_back_result_collection_failure() {
        let provider = FakeProvider::new(
            [ClientState::Suspended, ClientState::Stopped, ClientState::Stopped],
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
        );
        let result = super::execute_start_batch(
            &provider,
            &ClientId::VIRTUAL,
            |_, _| Ok(()),
            |client| {
                if client == ClientId::Virtual02 {
                    Err(io::Error::new(io::ErrorKind::Other, "status unavailable"))
                } else {
                    provider.state(client)
                }
            },
        );
        assert!(result.is_err());
        assert_eq!(
            *provider.states.borrow(),
            [ClientState::Suspended, ClientState::Stopped, ClientState::Stopped]
        );
    }

    #[test]
    fn start_batch_preserves_preexisting_running_client_on_verification_failure() {
        let provider = FakeProvider::new(
            [ClientState::Stopped, ClientState::Running, ClientState::Stopped],
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
        );
        let result = super::execute_start_batch(
            &provider,
            &ClientId::VIRTUAL,
            |_, _| Ok(()),
            |client| {
                if client == ClientId::Virtual02 {
                    Err(io::Error::new(io::ErrorKind::InvalidData, "guest mismatch"))
                } else {
                    provider.state(client)
                }
            },
        );
        assert!(result.is_err());
        assert_eq!(
            *provider.states.borrow(),
            [ClientState::Stopped, ClientState::Running, ClientState::Stopped]
        );
    }

    #[test]
    fn start_batch_tracks_provider_mutation_before_a_start_error() {
        let provider = FakeProvider {
            fail_start: Some(ClientId::Virtual02),
            fail_after_start: true,
            ..stopped_provider()
        };
        let result = super::execute_start_batch(
            &provider,
            &ClientId::VIRTUAL,
            |_, _| Ok(()),
            |client| provider.state(client),
        );
        assert!(result.is_err());
        assert_eq!(*provider.states.borrow(), [ClientState::Stopped; 3]);
    }

    #[test]
    fn start_batch_reports_rollback_failure_and_keeps_the_original_error() {
        let provider = FakeProvider {
            fail_start: Some(ClientId::Virtual02),
            fail_stop: Some(ClientId::Virtual01),
            ..stopped_provider()
        };
        let error = super::execute_start_batch(
            &provider,
            &ClientId::VIRTUAL,
            |_, _| Ok(()),
            |client| provider.state(client),
        )
        .unwrap_err();
        let message = error.to_string();
        assert!(message.contains("injected start failure"));
        assert!(message.contains("rollback incomplete for Virtual-01"));
        assert_eq!(
            *provider.states.borrow(),
            [ClientState::Running, ClientState::Stopped, ClientState::Stopped]
        );
    }

    #[test]
    fn start_batch_rolls_back_a_later_invalid_state() {
        let provider = FakeProvider::new(
            [ClientState::Stopped, ClientState::Error, ClientState::Stopped],
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
        );
        assert!(super::execute_start_batch(
            &provider,
            &ClientId::VIRTUAL,
            |_, _| Ok(()),
            |client| provider.state(client),
        )
        .is_err());
        assert_eq!(provider.state(ClientId::Virtual01).unwrap(), ClientState::Stopped);
        assert_eq!(provider.state(ClientId::Virtual02).unwrap(), ClientState::Error);
    }

    #[test]
    fn start_batch_success_changes_only_selected_clients() {
        let provider = stopped_provider();
        let result = super::execute_start_batch(
            &provider,
            &[ClientId::Virtual02],
            |_, _| Ok(()),
            |client| provider.state(client),
        )
        .unwrap();
        assert_eq!(result, vec![ClientState::Running]);
        assert_eq!(
            *provider.states.borrow(),
            [ClientState::Stopped, ClientState::Running, ClientState::Stopped]
        );
    }

    #[test]
    fn start_batch_stops_a_resumed_client_that_fails_verification() {
        let provider = FakeProvider::new(
            [ClientState::Suspended, ClientState::Stopped, ClientState::Stopped],
            [Some("uuid-a|mac-a"), Some("uuid-b|mac-b"), Some("uuid-c|mac-c")],
        );
        let result: io::Result<Vec<ClientState>> = super::execute_start_batch(
            &provider,
            &[ClientId::Virtual01],
            |_, _| Ok(()),
            |_| Err(io::Error::new(io::ErrorKind::InvalidData, "guest mismatch")),
        );
        assert!(result.is_err());
        assert_eq!(*provider.states.borrow(), [ClientState::Stopped; 3]);
    }

    #[test]
    fn setup_start_returns_running_without_a_guest_agent() {
        let provider = stopped_provider();
        for client in ClientId::VIRTUAL {
            assert_eq!(
                super::execute_setup_start(&provider, client, |_, _| Ok(())).unwrap(),
                ClientState::Running,
            );
        }
        assert_eq!(*provider.states.borrow(), [ClientState::Running; 3]);
    }

    #[test]
    fn setup_open_failure_stops_only_a_newly_started_client() {
        let provider = FakeProvider { fail_open: true, ..stopped_provider() };
        assert!(super::execute_setup_start(&provider, ClientId::Virtual01, |_, _| Ok(())).is_err());
        assert_eq!(*provider.states.borrow(), [ClientState::Stopped; 3]);
        provider.set_state(ClientId::Virtual01, ClientState::Running).unwrap();
        assert!(super::execute_setup_start(&provider, ClientId::Virtual01, |_, _| Ok(())).is_err());
        assert_eq!(provider.state(ClientId::Virtual01).unwrap(), ClientState::Running);
    }

    #[test]
    fn setup_admission_failure_does_not_start_a_client() {
        let provider = stopped_provider();
        assert!(super::execute_setup_start(&provider, ClientId::Virtual01, |_, _| {
            Err(io::Error::new(io::ErrorKind::InvalidInput, "not a fresh client"))
        }).is_err());
        assert_eq!(*provider.states.borrow(), [ClientState::Stopped; 3]);
    }

}
