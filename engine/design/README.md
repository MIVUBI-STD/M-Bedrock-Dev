# Game Design System

This directory owns reusable Game Design schema/templates for authoring and development.

It is **not** the current gameplay authority during a normal map audit.

## Audit authority

```text
Selected Map Version
→ sole current gameplay truth
```

The audit derives its Gameplay Contract only from explicit gameplay evidence contained in that exact artifact.

External design documents, client briefs, reconstructed specs, Technical Docs, old versions, and Development/Source are reference/archive material unless the user explicitly requests comparison/history.

## Missing intent

If the selected artifact does not ground a material expected behavior:

```text
BLOCKED / ambiguous
```

Do not fill the gap with stale documentation.

## Development use

The typed authoring contract remains owned by `engine/packages/game-design-spec/`. It can help create future map versions, but it does not override the artifact selected for audit.