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
→ runtimeProfile.parity = MATCH
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

Guest Agent security proof also requires:

- the agent has no fallback/shared token source; Windows guests read only `guestinfo.virtualclients.token`;
- cloned Virtual VMX files rotate the inherited Base token during the production hardware-policy path;
- `Base`, `Virtual-01`, `Virtual-02`, and `Virtual-03` do not share a Guest Agent token;
- invalid or missing tokens receive no status payload;
- the Windows firewall rule is scoped to the installed Guest Agent executable, TCP 47831, and `LocalSubnet`;
- the scheduled task has no finite execution-time ceiling for the long-running agent.

## Target-machine proof

```text
provision
→ unique Virtual identities
→ start 1
→ Virtual-01 RUNNING
→ guestToolsReady
→ guestAgentReady
→ versionParity MATCH
→ manually playable
→ suspend/resume
→ configure account
→ stop
→ set-ready
→ reset
→ repeat for Virtual-02 / Virtual-03
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

- all four clients remain manually controllable;
- all clients run exactly the same Minecraft Education version;
- accounts are licensed and in the same Microsoft 365 tenant;
- network path supports peer-to-peer multiplayer;
- Base remains unchanged;
- clone UUID/MAC identities remain unique;
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
- update apply remains unavailable while any Virtual is RUNNING or SUSPENDED;
- update staging never changes Native/Base/Virtual Minecraft lineage;
- self-update remains disabled until trusted signature verification is implemented and accepted.
