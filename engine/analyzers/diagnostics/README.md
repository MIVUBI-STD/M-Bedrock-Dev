# Diagnostics Analyzer

Read-only derivation of diagnostic findings from supported analyzer facts and runtime evidence.

## Internal hierarchy

```text
src/
├── core/           shared identity/reference findings
├── arena/          arena-specific findings
├── command/        command and command-chain findings
├── dialogue/       dialogue findings
├── compatibility/  manifest/Education compatibility findings
├── entity/         entity knowledge/transition findings
├── runtime/        runtime/knowledge evidence merge findings
├── script/         Script API/version/member/signature/type findings
├── structure/      structure and embedded-structure findings
├── topology/       topology findings/outliers
└── index.ts        sole cross-owner public entrypoint
```

Tests mirror the same hierarchy under `test/`.

## Boundary

- Diagnostics derive findings; they do not mutate artifacts.
- Parser/source semantics remain in their owning analyzers.
- Diagnostic IDs/contracts remain in `packages/diagnostics/`.
- Competing hypotheses and evidence discrimination remain in `packages/diagnostic-reasoning/`.
- Cross-owner consumers import through `src/index.ts`.
