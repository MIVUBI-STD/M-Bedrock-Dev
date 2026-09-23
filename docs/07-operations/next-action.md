# Next Action

The entity knowledge path now covers target acquisition, navigation, attack execution and sensor-driven transitions.

Implemented:

1. target/filter semantic extraction;
2. navigation variant + capability extraction;
3. melee/ranged attack semantic extraction;
4. shooter/damage-component prerequisites;
5. environment/entity sensor event extraction;
6. filter-presence evidence for sensors;
7. state-scoped knowledge evaluation across targeting/navigation/attack/sensors.

Next priority:

1. connect sensor-emitted events directly to event/component-group reachability;
2. detect unreachable or orphan event transitions;
3. expand attack prerequisites for fire_at_target/projectile definitions;
4. then move into structure/.mcstructure semantics and chunk/ticking lifecycle.

The diagnostic model should now distinguish:

```text
no target
target filtered out
target unreachable
attack behavior missing prerequisite
sensor transition never configured
```
