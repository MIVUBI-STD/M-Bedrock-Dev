# Virtual Clients Distribution

Distribution is separate from runtime lifecycle.

## Release identity

Stable release authority is one signed tag:

```text
virtual-clients-vMAJOR.MINOR.PATCH
```

The tag must point at the exact `Experimental` commit to release. That tag is the only release trigger for Virtual Clients. Release source, installer version, and Rust package version must be identical.

## Update policy

```text
startup
→ local runtime/schema health
→ one read-only update check
→ no heartbeat polling
```

An available update may be downloaded/staged later, but installation is gated by:

```text
all Virtual instances STOPPED
+ no mutation operation active
+ runtime schema compatible
```

Runtime self-update remains disabled until an explicit reviewed apply implementation exists. Configuration alone must never enable it.

## Trusted release assets

A trusted Windows release uses one canonical installer asset name:

```text
M-Bedrock-Virtual-Clients-MAJOR.MINOR.PATCH-windows-x86_64.exe
```

The release must contain:

```text
M-Bedrock-Virtual-Clients-MAJOR.MINOR.PATCH-windows-x86_64.exe
latest.json
SHA256SUMS.txt
build-provenance.json
installed-payloads.json
```

Required proof:

- exact source SHA;
- exact semantic version;
- installer asset name exactly matches the release version/platform;
- Authenticode-valid installer;
- Authenticode-valid installed CLI sidecar and Guest Agent;
- installed desktop signature state recorded explicitly rather than assumed;
- Authenticode signer thumbprint pinned into the release backend;
- installer SHA-256 plus per-file installed payload hashes;
- runtime-schema compatibility;
- Windows target-machine acceptance;
- no auto-publish from an untrusted build.

## Provider boundary

The Virtual Clients installer installs Virtual Clients only.

It must not silently install or upgrade:

- VMware Workstation/Fusion;
- Windows guest operating systems;
- Minecraft Education licenses/accounts.

Provider updates are detected/reported but remain provider-owned.

## Data preservation

Uninstalling the app must preserve runtime data by default:

```text
bases/
clients/
runtime-schema.json
```

Deleting VM/runtime data is a separate explicit destructive action.

## Implemented backend distribution

Current backend distribution now includes:

- current-user Windows installer definition;
- tag-bound trusted release workflow;
- release provenance + SHA256SUMS + installed-payload integrity manifest;
- read-only startup update check;
- internal HTTPS transport using the operating-system trust store;
- installer staging with SHA-256 verification;
- trusted builds can pin a publisher certificate thumbprint and require matching Authenticode verification before staging;
- staged-update metadata stored under Runtime data;
- apply readiness requiring compatible runtime schema and all Virtual instances fully stopped.

Runtime self-apply remains disabled. Enabling it requires a separate source change, review, and acceptance proof; changing release-channel JSON alone is rejected.

## Update staging flow

```text
check-update
→ UPDATE_AVAILABLE
→ stage-update
→ download installer from configured GitHub release
→ verify release-channel URL
→ verify SHA-256
→ verify Authenticode status + pinned publisher thumbprint
→ atomic stage
→ UPDATE_STAGED
```

Staging does not modify VMware clients, Base images, Minecraft Education, or runtime schema.

Application update and Minecraft/Base update remain separate owners.

## Native authority during application updates

An application update must never rewrite Minecraft/Base lineage merely to make parity appear healthy.

After an app update:

```text
detect Native
→ inspect registered Base
→ inspect Virtual lineage
→ require exact parity
```

If Native Minecraft changed independently, the application remains healthy but Virtual boot is blocked until a matching Base is prepared, registered, and the affected Virtual instances are reprovisioned.


## Fail-closed update readiness

Apply readiness is never inferred from missing provider state.

```text
provider unavailable
→ Virtual power state unknown
→ apply readiness = false
```

A staged path is surfaced only while the staged installer file still exists. Missing staged files are not presented as usable update state.


## Installer ownership authority

Canonical installer behavior is defined by:

- `package-contract.json` — files that a valid installed package must contain;
- `install-lifecycle-policy.json` — operations the installer may and may not own;
- `write-payload-manifest.ps1` — integrity evidence for installed package files;
- Tauri `tauri.conf.json` — Windows install scope and shell integration;
- `windows/installer-hooks.nsh` — desktop process-in-use gate.

Documentation must not redefine these policies.

## Desktop executable signing boundary

The trusted release records the Authenticode state of the desktop executable from the installed package. The current build does not claim the desktop executable is independently signed unless that installed artifact verifies successfully. CLI sidecar and Guest Agent signing are mandatory trusted-release gates; the NSIS installer itself is also mandatory signed.

Do not add a build-sign-build sequence and call it desktop signing proof. Independent desktop signing requires a package boundary that demonstrably preserves the signed executable bytes.

## Windows lifecycle

The desktop installer owns application files, Start Menu integration, repair, upgrade and uninstall registration. It does not own runtime-schema migration, Base/Virtual lifecycle, Guest Agent removal from existing VMs, or deletion of Virtual Clients runtime data.

Same-version installation is the repair path. Newer package versions may upgrade the desktop package. Downgrades remain disabled. Runtime compatibility after package replacement is decided by runtime-core schema authority, not by NSIS.
