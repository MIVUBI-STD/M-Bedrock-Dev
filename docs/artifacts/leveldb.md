# Bedrock LevelDB Boundary

Minecraft Bedrock stores world data in LevelDB rather than Java Edition's Anvil format. Microsoft world-package documentation shows the db/ directory containing binary table/log/manifest files.

## Source immutability

Native LevelDB implementations commonly create locks or maintain internal log state around an opened database. Therefore M-Bedrock-Dev does not open the original extracted source/db as its database handle.

immutable source/db
→ copy to owned working snapshot
→ open working snapshot
→ read/scan

This is stronger than relying only on createIfMissing:false.

## Transport vs semantics

adapters/leveldb
→ opaque key/value transport + bounded scan

analyzers/world-db
→ key/value semantic classification

future specialized decoders
→ chunks / subchunks / actors / players / NBT / properties

Unknown records remain opaque byte arrays.

## Resource policy

Scanning large worlds must be bounded by:

- maximum entry count;
- maximum individual value size;
- maximum cumulative value bytes.

Do not materialize the complete database into memory merely to inspect it.
