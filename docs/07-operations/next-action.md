# Next Action

Integrated artifact inspection now emits repair planning output without auto-apply.

Current high-value sequence:

1. integrated diagnostics — implemented;
2. conservative state/topology diagnostics — implemented;
3. deterministic linear absolute fill/setblock repair planning — implemented;
4. artifact fingerprint-bound PatchTransaction output — implemented;
5. nested execute repair remains diagnostic-only by design;
6. validation executor for planned transactions — next;
7. explicit apply orchestration only after validation contracts are executable.

Do not add automatic state-scope repair until isolation intent is established from stronger project/session evidence.
