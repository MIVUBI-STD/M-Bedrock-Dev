# Entity Knowledge Graph

The knowledge layer now represents not only facts but executable semantic relations.

## Relation kinds

Current relation vocabulary:

- `requires`
- `requires-any`
- `produces`
- `activates`
- `deactivates`
- `gates`
- `supersedes`
- `delayed-until-tick`
- `runtime-built-in`

## Why this matters

A stuck entity is not automatically a coordinate bug.

The engine can now represent dependency chains such as:

```text
move_towards_target
→ requires target provider
→ nearest_attackable_target OR hurt_by_target
```

and:

```text
open_door
→ requires navigation:path-through-doors
```

or:

```text
entity event
→ activates component group
→ applied on server-side entity tick
```

## First reasoning API

`assessEntityKnowledge()` compares active components/capabilities against documented `requires` and `requires-any` relations.

It intentionally reports missing documented prerequisites only. It does not yet infer which component groups are active from raw entity JSON.

## Static-analysis boundary

Minecraft can attach built-in behavior to certain entity/runtime identifiers. The knowledge catalog records this as a static-analysis limit instead of pretending JSON explains all runtime behavior.
