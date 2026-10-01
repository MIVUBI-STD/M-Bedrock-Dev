# Next Action

## Current lane — Detection Decision Hardening

The current priority is to strengthen bug-finding semantics, authority boundaries, candidate admission, review flow, and repository ownership before any new real-map test campaign.

## Canonical decision flow

```text
current map/design evidence
→ intended gameplay authority
→ actual behavior evidence
→ candidate discovery
→ counter-evidence search
→ player-impact gate
→ tester-trigger gate
→ severity
→ Proposed Bug Set
→ chat review
→ Approved Bug Set
→ canonical Bug Report V2
→ HTML
```

## Immediate non-test work

1. Remove stale or contradictory policy wording around intent authority, severity, report publication, and historical evidence.
2. Keep one semantic owner per decision: Gameplay Intent for authority/intent, Diagnostic Reasoning for candidates/counter-evidence, Bug Report for admission/severity/review/publication.
3. Keep historical QA as search/regression hints only, never current defect proof.
4. Ensure implementation maps and routing docs point to current owners and filenames.
5. Keep Minor/non-material findings out of normal client output.
6. Keep HTML strictly derived; discussion and approval happen before publication.
7. Do not add new detector families, databases, dashboards, approval UIs, or report schemas without a repeated proven need.

## Deferred intentionally

Do not start yet:

- Challenge-map audit/retest;
- Minecraft runtime testing;
- calibration/benchmark execution;
- HTML generation for current Challenge maps;
- CI expansion.

## Success condition

This phase is complete when repository rules tell one consistent story:

```text
feature/design
≠ technical anomaly
≠ gameplay bug

bug = grounded design contradiction
    + material player-visible consequence
    + tester-verifiable trigger
    + cleared counter-evidence
    + severity based on progression/recovery
```

After this policy/ownership pass is approved, real-map testing can resume as a separate step.
