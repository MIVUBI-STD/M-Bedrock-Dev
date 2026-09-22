# Bedrock LevelDB Adapter

Transport boundary for Minecraft Bedrock world databases.

Microsoft documents Bedrock worlds as using LevelDB storage, with the world package containing a db/ directory of binary .ldb, log, CURRENT, and MANIFEST files.

The adapter uses @8crafter/leveldb-zlib for Bedrock-compatible LevelDB transport. Bedrock's LevelDB lineage includes zlib-capable Mojang forks, so generic LevelDB packages are not assumed compatible.

## Safety boundary

M-Bedrock-Dev never opens the user's original world DB as the mutable database handle.

source/db
→ byte-for-byte directory snapshot
→ working/db-snapshot
→ LevelDB open/read

The native database library may manage lock/log/internal database files only inside the snapshot.

Current adapter is read-oriented. It exposes opaque byte keys and values and does not provide write/delete/batch methods.

## Semantic boundary

The database adapter owns:

- snapshot creation;
- Bedrock-compatible DB transport;
- exact byte key/value reads;
- bounded metadata scanning.

It does not own:

- chunk key semantics;
- subchunk decoding;
- actors/entities;
- player records;
- dynamic properties;
- NBT interpretation;
- repair policy.

Those become dedicated semantic decoders only when a concrete consumer requires them.
