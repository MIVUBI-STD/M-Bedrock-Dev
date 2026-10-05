# Development Planning

Current and future work that improves M-Bedrock-Dev itself.

## Active

- Repository information-architecture consolidation: reduce duplicate documentation authority, clarify naming, and separate durable docs from operational data.
- Consolidate bug-finding coverage and validation documentation into canonical owners while compatibility pointers protect active references.
- Keep structural ownership/naming/coverage verifiers aligned with each consolidation step.

## Documentation path migration

Final semantic directory names:

```text
docs/01-product/    → docs/product/
docs/02-artifacts/  → docs/artifacts/
docs/03-analysis/   → docs/analysis/
docs/04-repair/     → docs/repair/
docs/05-validation/ → docs/validation/
docs/06-system/     → docs/system/
docs/examples/      → docs/examples/   (unchanged)
```

Migration rule:

1. keep current numbered paths while the repository is active;
2. use `npm run verify:docs-migration-ready` to find remaining hard-coded numbered-path references;
3. update references to the semantic target names;
4. perform one atomic directory migration;
5. make the migration-readiness rule a permanent no-numbered-path guard;
6. do not keep duplicate compatibility directory trees after the migration.

## Backlog

- Complete documentation path migration only when the migration-readiness checker reports no uncontrolled numbered-path references.

- Continue consolidating `docs/03-analysis` and `docs/06-system` only where files share the same owner, audience, and lifecycle; preserve genuinely distinct domains.

- Bind the canonical bug-finding coverage model to machine-verifiable capability/coverage checks so new analyzers or reusable knowledge cannot become orphaned.

- Generate/query implementation ownership from machine-readable ownership where practical instead of maintaining large duplicated path maps.
- Add repository architecture checks for misplaced operational data, stale references, and ambiguous naming.
- Review runtime/model abstractions for unique ownership and remove representational layers that do not enforce a distinct invariant.

## Rule

Items here improve the product/repository. Map-specific audit work does not belong here.