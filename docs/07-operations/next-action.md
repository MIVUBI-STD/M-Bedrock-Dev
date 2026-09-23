# Next Action

A reliability-focused implementation audit found and corrected false-confidence and search-efficiency issues.

Fixed:

1. branch-level interleaving reduction instead of post-factorial canonicalization;
2. explicit interleaving explored-node budget;
3. duplicate operation-id rejection;
4. semantic coverage buckets no longer inflate from state diversity alone;
5. advanced invariant candidates are challenged against historical failure evidence;
6. transition-progress historical contradictions are now recognized.

No new general framework layer should be added.

Remaining work should be evidence-driven, with one important engineering hardening item still open before broad repair use:

- repair workspace realpath/symlink/root-overlap protection and collision-safe atomic writes.

Exact-head CI and local Minecraft runtime proof remain deferred until the user chooses to test.
