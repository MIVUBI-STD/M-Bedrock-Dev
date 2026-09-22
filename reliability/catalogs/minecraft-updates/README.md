# Minecraft Update Delta Catalog

Store one curated JSON file per Minecraft update only after reliable evidence exists.

Recommended filename:

```text
<version>.json
```

Example shape:

```json
{
  "schemaVersion": 1,
  "delta": {
    "fromVersion": "1.x.y",
    "toVersion": "1.x.z",
    "entries": [
      {
        "id": "stable-id",
        "kind": "behavior-changed",
        "domain": "entities",
        "capabilityTags": ["entity-ai"],
        "affectedIdentifiers": [],
        "summary": "Short factual change summary.",
        "source": "authoritative source or observed differential evidence",
        "confidence": "documented"
      }
    ]
  }
}
```

Do not add speculative changelog interpretations as `documented`.

Allowed confidence:

- `documented` — supported by authoritative release/update documentation;
- `observed` — reproduced by differential/runtime evidence;
- `inferred` — supported indirectly and explicitly not yet runtime-confirmed.
