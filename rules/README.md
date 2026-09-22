# Rules

Versioned compatibility/capability rules for Minecraft Bedrock and Minecraft Education.

Rules answer questions such as:

- is a capability available in this edition/version?
- is behavior stable, preview/beta, experimental, or Education-specific?
- which parser/validator semantics apply?

Rules do not own file transport or gameplay diagnostics.

Every durable rule requires edition/version scope and provenance.

Current rule lane:

```text
capabilities/
  core.ts     small, evidence-backed baseline rules
```

Do not turn `rules/` into an unverified compatibility dump. Add rules only when a real analyzer/validator/runtime decision consumes them.
