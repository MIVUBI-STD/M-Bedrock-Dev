# Bedrock LevelDB Keyspace Intelligence

LevelDB inspection now classifies key families without decoding arbitrary values.

## Official keyspaces

The classifier recognizes:

- `actorprefix...` actor records;
- actor digest keys;
- chunk-data records using documented chunk tag IDs.

Recognized chunk-data tags include:

- BlockEntity;
- PendingTicks;
- RandomTicks;
- FinalizedState;
- SubChunkPrefix;
- BiomeState;
- GenerationSeed;
- ConversionData;
- ActorDigestVersion;
- legacy entity/version records.

Chunk coordinates and dimension IDs are decoded only when the key length matches the documented legacy chunk-key layouts.

## Safety boundary

This layer classifies keys only.

It does not interpret arbitrary LevelDB values as NBT unless a value schema is separately known and validated.

This avoids turning version-sensitive native world storage into guessed semantics.
