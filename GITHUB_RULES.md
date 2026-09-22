# GitHub Execution Rules

## Branch authority

```text
Local = active development / remediation / source authority
main  = stable / release authority
```

Do not silently develop on `main`. Promotion from `Local` to `main` is explicit.

## Change discipline

For material changes:

1. identify the canonical owner;
2. gather the minimum evidence needed;
3. edit the smallest complete owner set;
4. add or update matching verification;
5. inspect the resulting diff;
6. report the actual proof level;
7. stop when acceptance is satisfied.

Do not introduce side branches unless explicitly requested or required for a review workflow.

## Atomicity

Prefer a coherent commit for one semantic change. Avoid commits that mix architecture, unrelated refactors and feature behavior.

## Evidence boundary

GitHub/source work may prove static contracts, schemas, type safety, deterministic transformations, fixtures and CI. It does not by itself prove Minecraft runtime behavior.

## Generated and transient data

Do not commit extracted customer/user worlds, temporary build output, local Minecraft data, logs or workspace artifacts unless they are intentionally minimized fixtures with clear provenance and repository value.

## Security

Never commit credentials, tokens, private account data or proprietary user artifacts without explicit authorization and a repository need.
