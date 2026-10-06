#![forbid(unsafe_code)]

mod client;
mod contract;
mod diagnostics;
mod doctor;
mod error;
mod guest;
mod journal;
mod paths;
mod persistence;
mod policy;
mod profile;
mod provider;
mod resources;
mod runtime;
mod schema;
mod support;
mod update;

pub use client::{ClientId, ClientState, ClientStatus, DestructiveConfirmation, IdentityState};
pub use contract::{SuccessReport, PUBLIC_CONTRACT_SCHEMA};
pub use diagnostics::{
    DiagnosticsReport, HostDiagnostics, ProviderDiagnostics, VirtualHardwareDiagnostics,
};
pub use doctor::{
    DoctorClient, DoctorReport, HealthIssue, HealthIssueCode, HealthSeverity, SetupAction,
};
pub use error::{ErrorCode, ErrorReport};
pub use journal::{read_operation_history, OperationKind, OperationOutcome, OperationRecord};
pub use policy::{engine_policy, EnginePolicy, MAX_VIRTUAL_CLIENTS, READY_SNAPSHOT_NAME, VIRTUAL_VCPUS};
pub use profile::{
    BaseProfile, BaseProfileSource, BaseState, MinecraftInstallType, MinecraftProfile,
    ProfileParity, ProfileStatus,
};
pub use resources::{HostPressure, PressureLevel, VIRTUAL_MEMORY_LIMIT_MB};
pub use runtime::{ResourceView, RuntimeStatus, VirtualClients};
pub use schema::{SchemaState, SchemaStatus, CURRENT_RUNTIME_SCHEMA};
pub use support::{EngineSnapshot, SupportBundleResult};
pub use update::{StagedUpdate, UpdateCheck, UpdateState};

#[doc(hidden)]
pub use guest::{GuestStatus, GUEST_AGENT_PORT, GUEST_STATUS_SCHEMA};

#[doc(hidden)]
pub fn guest_agent_minecraft_profile() -> Option<MinecraftProfile> {
    profile::native_minecraft_profile()
}
