# Context and Token Efficiency

M-Bedrock-Dev should minimize context cost without weakening correctness.

## Read budget

After routing is known, default to:

```text
canonical owner/source   1–3 reads
supporting docs          only when decision-changing
history                  0 reads by default
broad repository scans   0 by default
```

Use `implementation-map.md` before broad search.

## Context tiers

```text
T0  current user request + active result
T1  exact semantic owner/source
T2  selected specialist procedure
T3  selected durable docs contract
T4  current operations/proof when material
T5  research/history only when needed
```

Do not preload T3–T5 merely for reassurance.

## Stable handles

Prefer stable IDs/hashes/paths instead of retransmitting full content:

- artifact fingerprint;
- project/session ID;
- semantic node ID;
- edge/diagnostic ID;
- patch transaction ID;
- content hash;
- exact source path + range.

Future MCP or desktop layers should pass these handles rather than repeat large source/context payloads.

## Incremental rule

```text
changed file
→ changed normalized component
→ affected graph branch
→ affected diagnostics
→ affected validation
```

Unrelated analyzers and content remain reusable.

## Anti-patterns

Avoid:

- whole-world rescans after one function edit;
- repeating stable manifest/graph data in every operation;
- duplicate summaries of canonical docs;
- separate caches with different authorities;
- verbose progress/status objects that duplicate the semantic result;
- AI-visible payloads containing binary/opaque content unnecessarily.

Efficiency is measured as cost to a correct accepted result, not minimum bytes at the expense of safety.
