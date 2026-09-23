# Next Action

The Bedrock/Education Knowledge Layer now has its first executable entity dependency graph.

Implemented:

1. provenance-backed knowledge facts;
2. version/profile filtering;
3. machine-readable knowledge relations;
4. merge support for multiple catalogs;
5. entity prerequisite reasoning;
6. target-provider dependencies;
7. attack-component dependencies;
8. door/navigation dependency knowledge;
9. event-to-component-group lifecycle relations;
10. event application timing semantics;
11. runtime_identifier built-in-behavior caveat;
12. automatic verification for every JSON knowledge catalog.

Next priority is to connect entity JSON analysis to this graph:

```text
entity JSON
→ base components
→ component groups
→ events/triggers
→ possible active-state graph
→ knowledge prerequisite check
→ diagnostics with provenance
```

Then expand navigation variants and entity target/filter semantics before moving to structures/chunks.
