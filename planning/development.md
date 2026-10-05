# Development Planning

Current and future work that improves M-Bedrock-Dev itself.

## Active

- Repository information-architecture consolidation: reduce duplicate documentation authority, clarify naming, and separate durable docs from operational data.
- Consolidate bug-finding coverage and validation documentation into canonical owners while compatibility pointers protect active references.
- Add structural enforcement only after the target repository layout is agreed and migrated safely.

## Backlog

- Continue consolidating `docs/03-analysis` and `docs/06-system` only where files share the same owner, audience, and lifecycle; preserve genuinely distinct domains.

- Bind the canonical bug-finding coverage model to machine-verifiable capability/coverage checks so new analyzers or reusable knowledge cannot become orphaned.

- Generate/query implementation ownership from machine-readable ownership where practical instead of maintaining large duplicated path maps.
- Add repository architecture checks for misplaced operational data, stale references, and ambiguous naming.
- Review runtime/model abstractions for unique ownership and remove representational layers that do not enforce a distinct invariant.

## Rule

Items here improve the product/repository. Map-specific audit work does not belong here.