# Navigation Knowledge

Entity state analysis now derives navigation capabilities from active navigation component configuration.

Current extracted capabilities include:

- path through doors;
- open doors;
- open iron doors;
- break doors;
- path over water;
- swim;
- walk;
- sink;
- avoid water;
- avoid damage blocks.

These values are state-specific because navigation components can live inside component groups.

Knowledge prerequisite checks therefore evaluate the actual candidate state's navigation capabilities rather than only component names.

Example:

```text
minecraft:behavior.open_door
+
minecraft:navigation.walk { can_pass_doors: false }
→ prerequisite gap
```

This is a static diagnostic, not proof that a particular runtime path failed because of the door.
