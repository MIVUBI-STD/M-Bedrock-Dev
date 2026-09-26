# Current Validation

Status: REMOTE STATIC SOURCE + REPRESENTATIVE PRODUCTION PORTFOLIO GREEN; RUNTIME PROOF PENDING

Latest production proof on 2026-09-23 used the exact `Local` portable workspace and Node `v24.21.0`.

The branch has source verification through GitHub Actions:

```text
Repository Policy   VERIFIED
source boundaries   VERIFIED
TypeScript           VERIFIED
Vitest               VERIFIED
```

## Representative production portfolio

Two real production `.mcworld` artifacts were analyzed.

Combined result:

```text
maps                  2
occurrences         570
unique symbols       82
known symbols        82
unclassified          0
promotion candidates  0
unknown.* symbols     0
```

Artifact-level:

```text
Defense V1   67 / 67 known, 0 unclassified, 0 unresolved refs
Defense V2   66 / 66 known, 0 unclassified, 0 unresolved refs
```

Precision fixes verified by production rerun:

- Defense V1 restricted-execution false positives: `2 → 0`;
- Defense V2 return-contract false positives: `2 → 0`;
- bundled/minified singleton alias gaps: eliminated;
- Script API unclassified portfolio symbols: `63 → 16 → 0`.

## Remaining real findings

Defense V2 retains four genuine 1.x deprecation findings:

- `world.afterEvents.entityHurt`;
- `Entity.isValid()`;
- `Entity.runCommandAsync`;
- `Dimension.runCommandAsync`.

They are not auto-repaired because a safe fix depends on the intended target Script API line and runtime semantics.

Entity-event reachability findings remain informational static limits where no internal, engine, command, or script trigger evidence is observed.

## Remaining proof lanes

- genuine Minecraft import/load acceptance;
- target-build runtime behavior;
- entity AI and event timing;
- chunk/load/saved-tick behavior beyond targeted readiness probes;
- real multi-client Minecraft session execution beyond the current generative/live-regression harness;
- semantic behavior changes with identical source syntax;
- controlled migration of the four legacy Defense V2 API usages if the target module line is upgraded.

These require local Minecraft or controlled runtime/differential evidence.

## Lifecycle migration exposure

Production migration inventory additionally measures deprecated member names whose receivers cannot always be reconstructed from bundled JavaScript.

Defense V2:

```text
runCommandAsync  57 total = 10 exact + 47 lexical-only
isValid          16 total =  5 exact + 11 lexical-only
playSound         2 total =  0 exact +  2 lexical-only
```

Defense V1 has two lexical-only `playSound` candidates and no exact deprecated Script API finding.

Lexical-only counts are evidence for migration planning and never generate diagnostics by themselves.

A partial `runCommandAsync` rewrite was rejected as a final map repair because it changed only a small portion of the 57-call exposure and would risk changing asynchronous gameplay semantics.

## Repository engineering baseline — 2026-09-24

Exact `Local` repository verification now includes:

```text
Node developer/build     24.21.0
npm developer/build      11.19.0
package-lock             v3 / mandatory
locked package entries   213
production source files  419
orphan candidates        0
first-level modules      29
module edges             74
dependency cycles        0
```

Repository policy, module shape, dependency graph, production dependency classification, source boundaries, TypeScript, Vitest, source hygiene, and portable source packaging are green on the deterministic lockfile/toolchain lane.

### Dependency maintenance watch

The stable `@8crafter/leveldb-zlib@1.6.0` dependency currently resolves through `cmake-js@7.4.0`, whose build dependency chain includes deprecated `tar@6.2.1`.

Do not force an unverified `tar@7` override: the corresponding `cmake-js@8` line is a breaking major. Track upstream-compatible updates through Dependabot and validate any native-build dependency change through the normal exact-toolchain CI lane before adoption.

## Runtime harness progress — 2026-09-27

Repository runtime proof remains partial, but target identity handling is stricter:

- multiplayer generative coverage is partial through property-based session sequences, bounded state exploration, and interleaving reduction;
- multiplayer runtime coverage is partial through Bedrock observation capture, runtime control records, model/runtime comparison, and live regression incident capture;
- chunk runtime coverage is partial through targeted `Dimension.isChunkLoaded` readiness observations with fail-closed unknown handling;
- runtime profiles now have canonical SHA-256 target fingerprints;
- volatile player count is excluded from target-profile identity;
- the Bedrock harness no longer emits a hard-coded Minecraft version as runtime evidence;
- target version/edition/host/module inventory must be explicitly session-bound through `m-bedrock:target-profile`;
- the profile announcement adapter validates the declared profile before it can become a target fingerprint.

The session binding proves that a declared target profile is attached to the active script session. It does not yet prove that every declared field is independently engine-introspected.

Still unproven in automated real Minecraft execution:

- executable experiment protocol transport;
- multi-client orchestration;
- chunk lifecycle chaos / unload-reload timing;
- recovery lease allocation and cleanup under real engine contention;
- saved-tick semantics;
- entity AI/event timing under live runtime conditions.
