# Virtual Clients Backend Acceptance

## Source proof

The Experimental workflow must pass on both Windows and macOS:

```text
cargo check --locked --all-targets
cargo test --locked --all-targets
cargo fmt --all --check
```

Hosted source proof does not prove VMware, GPU, input, Microsoft sign-in, or Minecraft runtime behavior.

## Version authority proof

Before provisioning:

```text
doctor
→ Native Minecraft version detected
→ Base present + stopped
→ register-base
→ baseState = REGISTERED
→ runtimeProfile.parity = MATCH
→ finalize-base.ps1 -ConfirmGeneralize
→ Sysprep /generalize /oobe /mode:vm
→ Base shuts down
→ baseState = FINALIZED
→ readyForProvisioning = true
```

Changing/updating Native Minecraft without rebuilding/re-registering Base must produce:

```text
runtimeProfile.parity = MISMATCH
start/provision blocked
```

## Guest Agent proof

For every Virtual:

```text
start
→ VMware Tools ready
→ Guest Agent reachable
→ Guest Agent version = host backend version
→ live Minecraft version = Native version
→ versionParity = MATCH
```

A newly started mismatch must be stopped and batch rollback attempted.

Base lifecycle proof also requires:

- `register-base` refuses to boot a Base already marked `FINALIZED`;
- `provision` and `reprovision` refuse any Base whose canonical state is not `FINALIZED`;
- `finalize-base.ps1` requires explicit `-ConfirmGeneralize`, a `REGISTERED` Base, clean Microsoft device registration, VMware Tools, and successful Sysprep;
- the pre-existing `guestinfo.virtualclients.baseState` value changes `REGISTERED → FINALIZING → FINALIZED` and remains `FINALIZED` after shutdown;
- a failed Sysprep attempt must not produce `FINALIZED`.

Guest Agent security proof also requires:

- the agent has no fallback/shared token source; Windows guests read only `guestinfo.virtualclients.token`;
- cloned Virtual VMX files rotate the inherited Base token during the production hardware-policy path;
- Base preparation rejects Microsoft Entra joined or Workplace joined source VMs;
- Guest Agent exposes only a SHA-256 fingerprint of Windows MachineGuid, never the raw identifier;
- `Base`, `Virtual-01`, `Virtual-02`, and `Virtual-03` do not share a Guest Agent token;
- invalid or missing tokens receive no status payload;
- the Windows firewall rule is scoped to the installed Guest Agent executable, TCP 47831, and `LocalSubnet`;
- the scheduled task has no finite execution-time ceiling for the long-running agent;
- Base preparation registers the startup task but does not launch the agent before host-side guestinfo token injection.

## Target-machine proof

```text
provision
→ start 3
→ verify-identities
→ vmIdentity = UNIQUE for all three
→ windowsIdentity = UNIQUE for all three
→ doctor nextSetupAction = CREATE_READY_SNAPSHOTS
→ stop all
→ start 1
→ Virtual-01 RUNNING
→ guestToolsReady
→ guestAgentReady
→ versionParity MATCH
→ manually playable
→ configure account once
→ verify signed-in Minecraft menu
→ stop
→ start again without signing in again
→ suspend/resume without signing in again
→ stop
→ set-ready
→ reset
→ start again and verify account session remains usable
→ repeat for Virtual-02 / Virtual-03
→ doctor nextSetupAction = READY
→ resources 3
→ start 3
→ open Native manually
→ control Native + 3 Virtual clients
→ host/join Minecraft Education multiplayer
→ disconnect/reconnect one Virtual
→ suspend one Virtual
→ stop all
→ start 3 again
```

Required observations:

- Base contains no Microsoft/Minecraft user session;
- each Virtual uses its own account session and does not inherit another Virtual's session;
- `start`, `stop`, `restart`, `suspend`, resume and `open` preserve the selected Virtual's guest/account state;
- repeated daily starts do not require sign-in again while the Microsoft/Minecraft session remains valid;
- `verify-identities` persists only identity fingerprints into client provenance, never account/session secrets;
- `set-ready` rejects a Virtual without verified VM + Windows identity provenance;
- `QA_READY` is created after account setup and reset restores that configured checkpoint;
- `reset` restores `QA_READY`, boots the selected Virtual, and returns `RUNNING`;
- `reprovision` is explicitly destructive to the selected Virtual's saved account session and requires explicit destruction confirmation;
- no Microsoft password/token/session secret is written into Virtual Clients runtime/profile data;
- all four clients remain manually controllable;
- all clients run exactly the same Minecraft Education version;
- accounts are licensed and in the same Microsoft 365 tenant;
- network path supports peer-to-peer multiplayer;
- Base remains unchanged;
- clone UUID/MAC identities remain unique;
- with Virtual-01/02/03 running together, each reports `windowsIdentity = UNIQUE`;
- 4 GB is treated as a ceiling, not measured resident use;
- host working-set telemetry is plausible;
- CRITICAL pressure blocks new starts without killing existing clients;
- suspend/resume remains usable;
- QA_READY reset affects only the selected Virtual;
- reprovision affects only the selected fully stopped Virtual;
- rollback failures are surfaced explicitly.

## Support boundary

Virtualization itself is not treated as officially supported by Minecraft Education until this target-machine campaign proves the complete workflow.

Windows + VMware Workstation is the primary target.

macOS/Fusion remains a separate acceptance campaign.

## Distribution proof

Windows distribution acceptance requires:

- exact source version equals Cargo/package version;
- release binaries built with `--locked`;
- current-user installer builds from exact source SHA;
- uninstall preserves Runtime data by default;
- provenance records source SHA, version, runtime schema and installer SHA-256;
- update check performs no install or runtime mutation;
- staged installer URL matches the configured GitHub release channel;
- staged installer SHA-256 matches manifest metadata;
- trusted build embeds the expected publisher certificate thumbprint;
- staged installer Authenticode status is Valid and signer thumbprint matches both embedded publisher identity and manifest metadata;
- update apply remains unavailable while any Virtual is RUNNING or SUSPENDED;
- update staging never changes Native/Base/Virtual Minecraft lineage;
- self-update remains disabled until trusted signature verification is implemented and accepted.


## Windows acceptance execution

Use the installed evidence collector instead of manually copying CLI output:

```powershell
& "$env:LOCALAPPDATA\Programs\M-Bedrock Virtual Clients\acceptance\windows\collect-acceptance.ps1" `
  -VirtualClients "$env:LOCALAPPDATA\Programs\M-Bedrock Virtual Clients\virtual-clients.exe"
```

After all three Virtual instances are running and first-boot Windows setup has completed:

```powershell
& "$env:LOCALAPPDATA\Programs\M-Bedrock Virtual Clients\acceptance\windows\collect-acceptance.ps1" `
  -VirtualClients "$env:LOCALAPPDATA\Programs\M-Bedrock Virtual Clients\virtual-clients.exe" `
  -VerifyIdentities
```

The collector writes timestamped evidence outside the repository by default and captures `doctor`, `status`, `diagnostics`, `resources 3`, optional `verify-identities`, and one `summary.json`. It never reads or stores Microsoft credentials, account names, worlds, or gameplay content.

First-boot acceptance after Sysprep also requires:

- each newly provisioned Virtual completes Windows specialization/OOBE only during initial setup;
- first boot does not modify the immutable Base;
- after initial setup, stop/start does not return the Virtual to OOBE;
- Guest Agent becomes reachable after first-boot setup;
- `verify-identities` returns `vmIdentity = UNIQUE` and `windowsIdentity = UNIQUE` for all three;
- account sign-in happens only after identity verification;
- later daily starts preserve the configured Windows and Minecraft account state.
