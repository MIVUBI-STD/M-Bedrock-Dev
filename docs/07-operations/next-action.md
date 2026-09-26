# Next Action

M-Bedrock-Dev now has behavior provenance, happens-before concurrency semantics, adversarial invariant promotion gates, semantic before/after trace comparison, property-to-diagnostic evidence binding, and explicit runtime-class semantic overlays.

## Current lane — Host/Edition Semantics Before Runtime Testing

Do not expand local/live Minecraft testing yet.

### Completed semantic separation

- Bedrock retail client;
- Bedrock listen server;
- Bedrock Dedicated Server;
- Realm;
- Bedrock Preview client;
- Minecraft Education host;
- Editor;

are represented as distinct semantic runtime classes.

Claims do not flow between runtime classes automatically.

Inheritance is allowed only when a target overlay explicitly names:

```text
source overlay
+
specific claim IDs
```

This prevents broad assumptions such as `Education = Bedrock + flags` or `BDS = listen-server semantics`.

### Completed reasoning bridge

Temporal/property evaluation can become diagnostic symptom evidence while preserving:

```text
violated  → present symptom
satisfied → absent symptom
unknown   → unknown symptom
```

A property violation may support a declared hypothesis but never creates an automatic root-cause conclusion.

## Next architecture order

1. build a versioned semantic-claim registry for runtime overlays;
2. bind official/documented knowledge to claims where evidence exists;
3. add explicit conflict detection between documented and observed claims;
4. strengthen partial-order reduction with causal closure/generation equivalence;
5. build calibration-corpus contracts for future probabilistic belief;
6. only then connect physical Minecraft runtime channels.

## Safety

- runtime-class inheritance is explicit per claim;
- absence of a claim means unknown, not false;
- Education/BDS/Preview semantics must not be inferred from retail semantics by default;
- symptom evidence is not causation;
- designed overlays remain specifications until stronger provenance is attached.
