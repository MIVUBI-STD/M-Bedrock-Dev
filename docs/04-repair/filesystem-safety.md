# Repair Filesystem Safety

Repair application treats the filesystem as a trust boundary.

## Root preparation

Before any precondition read or write:

1. sourceRoot and workingRoot must exist and be directories;
2. both roots are resolved through realpath;
3. source and working roots must not overlap in either direction.

This prevents a working directory nested inside immutable source, or source nested inside the mutable workspace.

## Target resolution

Every mutation target is checked against:

- lexical containment in the working root;
- realpath containment after symlink resolution;
- source-root overlap;
- direct symbolic-link targets;
- regular-file type;
- hardlink identity against the same relative source path when both exist.

For not-yet-existing targets, the real parent directory is checked before constructing the target path.

## Atomic writes

Atomic replacement uses a unique same-directory temporary file opened with exclusive creation.

The temp file includes process identity plus a random UUID, eliminating the old fixed-name collision risk.

Before rename:

- content is written;
- file data is synced;
- existing destination mode is copied to the temp file.

The final rename remains same-directory so the replacement stays atomic on filesystems that provide atomic rename semantics.

## Remaining limits

Filesystem semantics differ across platforms and network filesystems. This layer reduces path/link/collision risk but does not claim protection against a fully hostile filesystem or concurrent privileged attacker.
