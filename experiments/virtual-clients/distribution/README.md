# Virtual Clients Distribution

Distribution is separate from runtime lifecycle.

## Release identity

Stable release tags:

```text
virtual-clients-vMAJOR.MINOR.PATCH
```

Release source, installer version, Rust package version, and future Tauri version must be identical.

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

Runtime self-update remains disabled until the signed installer/Tauri layer is implemented and accepted.

## Trusted release assets

A trusted Windows release must eventually contain:

```text
installer.exe
installer.exe.sig
latest.json
SHA256SUMS.txt
build-provenance.json
```

Required proof:

- exact source SHA;
- exact semantic version;
- Authenticode-valid installer;
- Tauri updater signature;
- SHA-256 checksums;
- runtime-schema compatibility;
- backend Windows acceptance;
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
- exact-SHA draft release workflow;
- release provenance + SHA256SUMS;
- read-only startup update check;
- internal HTTPS transport using the operating-system trust store;
- installer staging with SHA-256 verification;
- staged-update metadata stored under Runtime data;
- apply readiness requiring compatible runtime schema and all Virtual instances fully stopped.

Runtime self-apply remains disabled until trusted installer signing and signature verification are accepted.

## Update staging flow

```text
check-update
→ UPDATE_AVAILABLE
→ stage-update
→ download installer from configured GitHub release
→ verify release-channel URL
→ verify SHA-256
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
