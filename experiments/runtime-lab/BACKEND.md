# Runtime Lab Backend

Runtime Lab V1 is a manual multi-client launcher for Minecraft Education.

## Goal

```text
one PC
→ start 1–4 isolated Minecraft Education clients
→ keep them responsive
→ let the operator control every player manually
→ open / reset / stop individual clients
```

## Canonical backend path

```text
CLI now / UI later
        ↓
RuntimeLabBackend
        ↓
ClientRuntime
        ↓
Provider
        ↓
VMware Workstation on Windows
VMware Fusion on macOS
```

There is no scenario runner, test planner, role assignment, bot movement, or automated gameplay in V1.

## Ownership

- `runtime-lab-backend.mjs` — one application-level backend surface.
- `client-runtime.mjs` — one owner for client lifecycle.
- `doctor.mjs` — host readiness check.
- `providers/provider.mjs` — platform provider selection.
- provider-specific files — hypervisor mechanics only.
- `cli.mjs` — thin operator boundary.

## Commands

```text
lab doctor
lab status
lab start <1-4>
lab open <client>
lab reset <client>
lab stop [client]
```

No runtime action may pretend to succeed when the backing VM/client has not been provisioned.

## Frontend boundary

Frontend is intentionally deferred.

When frontend work begins, it must call `RuntimeLabBackend` and must not implement provider or lifecycle logic itself.
