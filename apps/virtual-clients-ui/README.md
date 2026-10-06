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

## Navigation

The UI keeps daily use separate from technical detail:

```text
Setup
→ current DoctorReport.nextSetupAction
→ guided one-step setup

Clients
→ Native + Virtual-01/02/03
→ common lifecycle actions first
→ advanced/recovery actions under More actions

Health
→ blockers/warnings
→ host/resource diagnostics
→ update staging
→ support bundle

History
→ recent backend mutation journal
```

The initial page is a presentation choice only: Setup while the backend reports a setup action, Clients once `nextSetupAction = READY`. Navigation does not create or persist lifecycle state.

Lifecycle button eligibility always comes from backend `actions`. The UI never infers whether an action is safe from client state.

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

The probe must:

1. resolve the packaged UI `index.html`;
2. resolve and start `bridge/virtual-clients-bridge.exe`;
3. invoke backend `policy`;
4. receive public contract schema 1.

Installer verification fails when this chain is broken.

## Commands

```bash
npm run virtual-clients-ui:dev
npm run virtual-clients-ui:build
npm run virtual-clients-ui:preview
```

## Native bridge protocol

The installed backend includes `bridge/virtual-clients-bridge.exe`.

The process uses newline-delimited JSON on stdin/stdout:

```json
{"schema":1,"requestId":1,"command":"policy","args":[]}
```

Response:

```json
{"schema":1,"requestId":1,"success":true,"payload":"{...public contract JSON...}"}
```

The desktop host correlates `requestId` and returns only the bridge `payload` through `window.virtualClients.invoke`. It does not reinterpret the backend response.
