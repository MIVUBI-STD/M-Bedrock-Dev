# Development Planning

Current and future work that improves M-Bedrock-Dev itself.

## Completed repository consolidation

- remote GitHub established as the primary ChatGPT repository workflow; local npm/DEV.cmd execution is optional stronger proof only;
- semantic documentation domains established;
- numbered documentation paths retired;
- planning separated from workspace;
- current/historical operational state removed from docs;
- historical audit evidence moved to reliability history;
- reusable evaluation data moved to reliability corpus;
- bug-finding coverage consolidated into one canonical owner;
- validation consolidated into canonical proof/search/retest owners;
- repair consolidated into transaction and planning owners;
- analysis compatibility pointers removed after their content was absorbed;
- repository/documentation/path/coverage verifiers aligned with the final structure;
- repository knowledge access consolidated into one Router → Catalog → Graph → Retrieval → Context path;
- Resource Catalog, Graph, source types, document metadata, and canonical vocabulary synchronized under one verification contract;
- stale information-architecture migration work removed from operations planning after reconciliation.

Canonical documentation domains:

```text
docs/product/
docs/artifacts/
docs/analysis/
docs/repair/
docs/validation/
docs/system/
```

## Active

- Run knowledge-consumption audit and close actionable reusable knowledge that lacks a dedicated analyzer/proof binding.
- Continue reducing manually maintained implementation ownership only where machine-readable ownership can replace it safely.

## Backlog

- Promote strict knowledge-consumption verification into the main repository gate when current debt reaches zero.
- Review runtime/model abstractions for unique state/invariant ownership and remove representational layers that do not enforce a distinct responsibility.

## Rule

Items here improve the product/repository. Map-specific audit work does not belong here.