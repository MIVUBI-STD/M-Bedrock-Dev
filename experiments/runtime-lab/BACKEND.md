# Runtime Lab Backend

The backend is the only authority for Runtime Lab execution state.

## Canonical flow

```text
operator command
→ RuntimeLabBackend
→ config + scenario planning
→ host health gate
→ provider registry
→ provider adapter
→ client lifecycle
→ runtime evidence
```

There is no second scheduler, device manager, provider selector, or scenario runner.

## Ownership

```text
src/runtime-lab-backend.mjs     application backend owner
src/cli.mjs                     thin operator command boundary
src/config/                     config loading/validation
src/scenarios/                  scenario intent → execution plan
src/health/                     environment/runtime health decisions
src/providers/                  provider discovery + provider adapters
config/                         declarative product defaults
runtime/                        local generated/runtime state; never Git authority
```

Provider adapters own hypervisor mechanics only. They do not own scenario policy, health truth, evidence classification, or user-facing workflow.

## User-facing contract

The user should not need to know which provider command is required.

```text
lab doctor
lab status
lab provision
lab start <count>
lab stop
lab reset [client]
lab run <scenario>
```

Commands not yet implemented must fail explicitly rather than simulate success.

## Frontend boundary

A future frontend must call the same backend contract. It must not invoke VMware, Fusion, Parallels, or VirtualBox directly.

```text
future UI
   ↓
RuntimeLabBackend
   ↓
same execution path used by CLI
```

Frontend work starts only after backend lifecycle, scenario planning, reset semantics, and health gates are stable.
