# Next Action

The Bedrock entity knowledge path now covers target acquisition as well as navigation prerequisites.

Implemented:

1. target-provider semantic extraction;
2. nested is_family filter extraction;
3. max distance / visibility / reachability / radius semantics;
4. configured-target capability generation;
5. navigation variant identity;
6. state-scoped combination of targeting and navigation capabilities;
7. knowledge diagnostics for unconfigured target providers.

Next priority:

1. encode target/filter facts into the official entity knowledge catalog;
2. add family/component matching semantics beyond is_family;
3. add melee/ranged attack execution prerequisites;
4. model sensor/environment-triggered transitions;
5. then move to structure and chunk/ticking knowledge.

A stuck entity should now be classified across three distinct questions:

```text
Was a valid target configured?
Can a target actually be acquired?
Can navigation execute a path to it?
```
