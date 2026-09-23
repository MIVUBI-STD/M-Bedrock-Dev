# Attack and Sensor Knowledge

Entity analysis now separates combat execution from target acquisition and navigation.

## Attack semantics

Recognized behavior families include:

- melee_attack;
- melee_box_attack;
- delayed_attack;
- ranged_attack;
- fire_at_target.

State-derived capabilities include:

- attack:behavior:melee;
- attack:behavior:ranged;
- attack:damage-component;
- attack:shooter.

This enables prerequisite checks such as:

```text
ranged_attack
→ requires minecraft:shooter

melee_attack
→ requires minecraft:attack
```

## Sensor semantics

Environment and entity sensors are modeled as conditional event emitters.

The analyzer records:

- emitted event identifiers;
- whether filter conditions are present;
- whether the sensor has any configured event at all.

This connects:

```text
sensor condition
→ event
→ component group transition
→ active combat/navigation state
```

The result is still static possible-state reasoning. Runtime evidence is required to prove that a sensor condition actually became true in a real game session.
