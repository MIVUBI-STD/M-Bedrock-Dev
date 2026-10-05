# Development Planning

Current and future work that improves M-Bedrock-Dev itself.

## Active

- Repository information-architecture consolidation: reduce duplicate documentation authority, clarify naming, and separate durable docs from operational data.
- Consolidate bug-finding coverage and validation documentation into canonical owners while compatibility pointers protect active references.
- Keep structural ownership/naming/coverage verifiers aligned with each consolidation step.

## Documentation path migration

Completed on branch `Local`:

```text
docs/product/
docs/artifacts/
docs/analysis/
docs/repair/
docs/validation/
docs/system/
```

Retired numbered documentation paths are permanently rejected by repository verification.

## Backlog

- Continue consolidating `docs/analysis` and `docs/system` only where files share the same owner, audience, and lifecycle; preserve genuinely distinct domains.

- Run `npm run audit:knowledge-consumption`, close actionable knowledge without dedicated analyzer/proof bindings, then promote `verify:knowledge-consumption` into `verify:repository` once debt reaches zero.

- Generate/query implementation ownership from machine-readable ownership where practical instead of maintaining large duplicated path maps.
- Add repository architecture checks for misplaced operational data, stale references, and ambiguous naming.
- Review runtime/model abstractions for unique ownership and remove representational layers that do not enforce a distinct invariant.

## Rule

Items here improve the product/repository. Map-specific audit work does not belong here.