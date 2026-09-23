# Next Action

Entity JSON is now connected to the Bedrock knowledge dependency graph.

Implemented:

1. entity definition parser;
2. base-component extraction;
3. component-group extraction;
4. recursive event add/remove/trigger extraction;
5. conservative possible-state graph;
6. separate group states instead of unsafe global union;
7. event-added multi-group states;
8. state-scoped knowledge prerequisite checks;
9. runtime_identifier static-analysis limitation reporting.

Next priority:

1. add navigation capability extraction (door/water/swim/avoidance/path flags);
2. add target/filter semantics and family matching knowledge;
3. model sensor/environment-triggered transitions more explicitly;
4. connect entity knowledge findings into the main inspection diagnostics with provenance;
5. then expand structure and chunk/ticking knowledge.

Keep runtime state claims conservative until live evidence exists.
