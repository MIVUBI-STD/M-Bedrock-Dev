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

## Bridge

The browser bundle expects a desktop host to inject:

```ts
window.virtualClients.invoke(command, args)
```

The bridge returns the Rust CLI/public-contract JSON string. Until a desktop host is connected, the UI intentionally displays **Backend bridge unavailable** instead of mock VM data.

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

The desktop window host is responsible only for correlating `requestId` and exposing the returned `payload` through `window.virtualClients.invoke`. It must not interpret lifecycle policy or backend data.
