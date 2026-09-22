# Runtime Control Protocol

Runtime control is intentionally separate from runtime evidence capture.

## Vocabulary

The first control vocabulary is deliberately small:

- assign player to arena;
- start player session;
- disconnect request;
- reconnect/reset-to-assigned request;
- reset arena.

It does not expose arbitrary Minecraft commands.

## Planning

A timed session scenario can be converted to a `RuntimeControlPlan`.

Non-control model actions such as `join`, `begin-playing`, `progress`, and `complete` are not automatically turned into runtime commands because their real implementation is map-specific.

## Transport

The development harness listens for:

```text
/scriptevent m-bedrock:control <json>
```

Each message contains:

```json
{
  "schemaVersion": 1,
  "scenarioId": "...",
  "runtimeTick": 123,
  "action": { "kind": "start", "playerId": "..." }
}
```

The harness queues actions until the requested runtime tick and emits an acknowledgement record.

## Important boundary

The sample harness implements a **convention adapter**, not a universal map controller.

For example:

- arena assignment uses `arena:<id>` tags;
- session phase uses `session:*` tags;
- reset writes `cutscene_active` when that objective exists.

Real maps may use functions, events, scripts, structures, or different objectives. Project-specific control adapters should translate the generic protocol into those canonical map mechanisms.

## Disconnect limitation

Script API cannot simulate a real network disconnect of another client.

The sample `disconnect` action therefore emits a test-side request marker (`test:disconnect-requested`) rather than pretending that a player left the server.

True disconnect/reconnect regression testing requires an external multi-client/runtime driver.

## Safety

The protocol intentionally does not expose arbitrary command execution. This keeps test orchestration bounded and prevents the reliability harness from becoming a generic remote-control surface.
