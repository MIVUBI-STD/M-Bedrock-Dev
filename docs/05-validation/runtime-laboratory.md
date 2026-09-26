# Controlled Runtime Laboratory

M-Bedrock-Dev uses controlled experiments to turn runtime uncertainty into bounded empirical evidence.

## Why a laboratory exists

Minecraft Bedrock and Education behavior cannot be inferred safely from source structure alone.

A controlled runtime experiment must separate:

- the **target runtime profile**;
- the **fixture**;
- the **environment**;
- the **controlled factors**;
- the **control/treatment arms**;
- the **protocol**;
- the **outcome predicates**;
- repeated trial evidence.

This prevents unrelated runtime differences from being mistaken for causal evidence.

## Experiment identity

Every trial is bound to:

```text
experiment id
definition revision
target profile fingerprint
fixture fingerprint
environment fingerprint
arm id
run index
```

A change to any identity dimension invalidates direct comparison with the original campaign unless a higher-level differential experiment explicitly models that change.

## Qualification states

```text
insufficient
observed
repeatable
intervention-supported
```

These states are deliberately below full causal proof.

`intervention-supported` means:

- minimum repetitions completed;
- every arm has internally repeatable outcomes;
- one or more declared outcome predicates differ between control and treatment;
- trials share the exact experiment definition, target, fixture, and environment.

It does **not** automatically mean all alternative causes have been excluded.

The causal engine therefore maps this state only to:

```text
INTERVENTION_SUPPORTED
```

not `CAUSAL`.

## Knowledge boundary

The lab may emit a `controlled-experiment` evidence reference only for repeatable or intervention-supported campaigns.

Knowledge claim promotion remains a separate action. A single observed trial cannot become verified engine knowledge.

## Execution context

Experiment definitions declare either:

```text
LOCAL_MINECRAFT
LIVE_MINECRAFT
```

A host below the required context must refuse execution.

Repository CI can validate experiment definitions and qualification algorithms, but it cannot satisfy a Minecraft runtime experiment.
