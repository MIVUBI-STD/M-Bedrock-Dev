# Virtual Clients UI

Thin Svelte/Vite frontend for the Virtual Clients Rust engine.

The frontend consumes the backend public contract only:

```text
policy
snapshot
actions
history
support-bundle
+ lifecycle mutations
```

It does not own lifecycle rules, resource policy, Base state, identity policy, update policy, or recovery decisions.

## User navigation

The normal user flow intentionally hides infrastructure terminology.

```text
not ready
→ Setup
→ one backend-directed step at a time

ready
→ Clients
→ Start all / Stop all
→ one primary action per Virtual
→ secondary and recovery actions under ···

Settings
→ automatic resource behavior
→ app update
→ version compatibility

Help & Support
→ user-facing issues
→ operation history
→ technical details
→ support bundle
```

Once `DoctorReport.nextSetupAction = READY`, Setup disappears from primary navigation. The app opens on Clients by default.

Internal backend terms such as Base lifecycle, provenance, identity proof, and `QA_READY` remain unchanged in the Rust contract. The UI translates them into user-facing concepts such as environment setup, client checks, recovery point, restore, and recreate.

Lifecycle button eligibility always comes from backend `actions`. The UI never infers whether an action is safe from client state. The UI may choose which allowed action is primary for presentation, but it cannot make a blocked action available.

Window arrangement is a desktop-host capability rather than lifecycle policy. On Windows, Arrange asks the backend to open running Virtual clients in dedicated VMware Workstation windows, then the desktop host positions discovered Minecraft/VMware windows using the primary monitor working area. Missing windows are reported; they are never synthesized.

## Desktop host boundary

The Windows installer includes `virtual-clients-app.exe`.

The desktop host owns only transport and presentation hosting:

```text
Start Menu shortcut
→ virtual-clients-app.exe
→ loopback-only randomized session URL
→ packaged Svelte UI
→ window.virtualClients.invoke(command, args)
→ virtual-clients-bridge.exe
→ Rust public contract
```

The host binds only to `127.0.0.1`, uses a random per-launch path token, rejects cross-origin invoke requests, serves only files under the packaged `ui` directory, and terminates after the UI closes or stops heartbeating.

`window.virtualClients.invoke` is injected by the desktop host before the Svelte bundle runs. Production UI code therefore still has one bridge contract and no mock/fallback runtime.

The host never interprets lifecycle eligibility, setup progression, resource policy, Base state, identity policy, or update policy. Those remain Rust backend authority.

## Packaged connection proof

The desktop host supports a non-visual installer probe:

```text
virtual-clients-app.exe --probe
```

The probe must resolve the packaged UI, start the bridge, invoke backend `policy`, and receive public contract schema 1.

## Commands

```bash
npm run virtual-clients-ui:dev
npm run virtual-clients-ui:build
npm run virtual-clients-ui:preview
```
