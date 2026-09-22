# Live Bedrock Reliability Harness

A development-only Script API behavior-pack harness now exists under:

```text
runtime/bedrock-reliability-harness/
```

## Runtime responsibilities

The harness:

1. reads configured player tags and scoreboard objectives;
2. reads configured arena fake-player scores;
3. captures selected entity evidence;
4. stamps the current script tick;
5. emits one compact JSON record to the Minecraft content log.

It does not evaluate correctness.

## Output transport

The default record prefix is:

```text
[M-BEDROCK-OBS]
```

The harness uses `console.warn()` because Microsoft documents warning output as reliably present in the content log, whereas regular log output depends on logging level. citeturn353433search0

The callback is scheduled with `system.runInterval`; Bedrock documents this API as a repeated tick callback mechanism. citeturn353433search1turn353433search3

## Script dependency

The example manifest targets Minecraft 1.26.40 and `@minecraft/server` 2.9.0, matching the documented 1.26.40 stable Script API release. citeturn353433search2

Treat the example manifest as a development harness baseline, not a universal production dependency policy.

## Offline ingestion

`parseRuntimeObservationLog()` extracts prefixed snapshot records from noisy Minecraft content logs.

This creates the first live loop:

```text
Minecraft
→ content log
→ observation parser
→ RuntimeObservationSnapshot
→ model/invariant comparison
```

## Configuration boundary

Before using the harness on a project, configure:

- scoreboard objective IDs;
- arena score participants;
- session/arena tags;
- capture interval;
- selected entity queries;
- artifact fingerprint;
- Minecraft version provenance.

Do not infer project naming conventions inside the harness.
