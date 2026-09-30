# Adapters

External and native Bedrock format translation.

## Format groups

```text
native-storage/
├─ nbt
└─ leveldb

structure-format/
└─ mcstructure
```

Canonical group assignment lives in `ownership.json`.

Adapters translate representations and preserve unknown data where required. They do not own gameplay diagnosis, compatibility policy, or repair decisions.
