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
