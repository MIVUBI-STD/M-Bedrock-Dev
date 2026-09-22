# Next Action

Planned topology repairs now have executable post-mutation validation.

Current high-value sequence:

1. integrated diagnostics — implemented;
2. conservative state/topology diagnostics — implemented;
3. deterministic topology PatchTransaction planning — implemented;
4. fingerprint + exact-line guarded working-copy apply — implemented;
5. executable repair validation — implemented;
6. explicit apply orchestration with automatic rollback on validation failure — next;
7. package/reopen validation after accepted mutation;
8. expand repair classes only from reproduced map bugs.

A successful filesystem write is not an accepted repair unless validation passes.
