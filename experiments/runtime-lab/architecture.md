# Runtime Lab Architecture

## Design goals

1. Interactive rather than headless: secondary clients must remain playable.
2. Efficient: only required clients run for a scenario.
3. Reproducible: every client starts from a named state image.
4. Provider-agnostic: Windows and macOS share one core contract.
5. Evidence-safe: an unhealthy host/client invalidates runtime proof.
6. Disposable: experimental implementation can be replaced without changing audit authority.

## Core model

```text
DeviceProfile
    │
    ├── MCE-01
    ├── MCE-02
    ├── MCE-03
    └── MCE-04

Scenario
    ↓
Scenario Planner
    ↓
Device Manager
    ↓
RuntimeProvider
    ↓
Host / VM backend
```

### DeviceProfile

Describes desired resources and interaction characteristics. It contains no provider commands.

### Client

Stable logical identity. Scenario roles are assigned dynamically and must not be encoded into client names.

### StateImage

Named reset point.

```text
BASE_CLEAN
    ↓
QA_READY
    ↓
TEST_SESSION
```

Normal reset returns to `QA_READY`. Factory reset returns to `BASE_CLEAN`.

### Scenario

Declares the number of clients and runtime behavior required by a test. It must not name provider executables, VM paths, credentials or host-specific identifiers.

## Health gate

A scenario may enter interactive test execution only when required clients are healthy.

Minimum logical checks:

- provider reachable;
- client state READY;
- target Minecraft Education version consistent across active clients;
- memory pressure below configured failure threshold;
- interactive FPS at or above the profile floor;
- network reachability valid;
- no unresolved boot/reset operation.

Health failure means the environment is invalid for proof. It is not automatically a game defect.

## Resource policy

The planner powers on only the required number of clients.

```text
1 client → local/runtime sanity
2 clients → replication / reconnect
3 clients → multiplayer interactions
4 clients → concurrency / multi-arena
```

Primary client remains native where possible. Virtual clients use low graphics and bounded CPU/RAM.

## Provider boundary

A provider owns only environment mechanics: capability discovery, create/clone, start/stop, snapshot/restore, status, viewport/screenshot, and focus/open-console operations.

A provider must not classify bugs, infer expected gameplay, edit selected map content, mutate audit state, or hide health failures.

## Platform strategy

Windows and macOS share the same logical topology: one native primary client plus up to three virtual interactive clients. Apple Silicon guest configurations require explicit lab validation before they can be marked supported.

## Security

Never commit Microsoft account credentials, VM disks, signed-in user profile exports, private worlds, or machine-specific secrets. Local runtime state belongs outside Git.
