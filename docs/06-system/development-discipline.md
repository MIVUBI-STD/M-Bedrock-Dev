# Development Discipline

Default order:

```text
No change required?
→ remove unnecessary path?
→ reuse current owner?
→ use native/existing capability?
→ smallest complete addition
→ new abstraction only after repeated responsibility is proven
```

For bugs:

```text
symptom
→ evidence
→ first wrong owner
→ minimal repair
→ focused regression
→ broader affected-scope check
→ strongest available validation
```

For new capability:

```text
user outcome
→ semantic owner
→ input/output contract
→ deterministic core
→ adapter/interface integration
→ proof
```

Never use code volume, abstraction count or architectural novelty as a quality proxy.
