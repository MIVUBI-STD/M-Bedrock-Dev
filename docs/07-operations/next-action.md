# Next Action

Script API usage can now be correlated directly with Minecraft update evidence.

Implemented:

1. per-map and multi-map Script API usage inventory;
2. bounded receiver inference and method/event symbol classification;
3. Script update correlation in `compare-update`;
4. deterministic aliases between source syntax and documented class/event-container identifiers;
5. separate module-surface overlap and exact/alias symbol matches;
6. before/after occurrence and source-file evidence for matched symbols;
7. unclassified observed symbols retained as knowledge gaps;
8. Minecraft 1.26.40 catalog enriched with documented v2.9.0 promoted symbols and runtime-fix identifiers;
9. correlation remains descriptive and never asserts update causation.

Next priority:

1. add deprecated and removed Script API symbol states from official changelogs and detect real-map exposure to them;
2. run `script-usage` and `compare-update` against representative production maps to establish actual symbol/update overlap distributions;
3. promote high-frequency unclassified symbols only after official version provenance is established;
4. extend execution-privilege rules to inferred receiver methods where Microsoft explicitly documents restrictions;
5. add regression-level affected identifiers only when a reproduced historical regression can name them reliably;
6. consider longitudinal symbol-usage snapshots only after production portfolio evidence justifies storage.

Usage-driven expansion remains the default. Broad or fuzzy API matching stays out of the hot path.
