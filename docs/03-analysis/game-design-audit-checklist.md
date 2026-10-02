# Game Design Audit Checklist

This checklist supports Gameplay Model Closure. It is not sufficient by itself.

Before bug discovery:

- [ ] Gameplay surfaces inventoried
- [ ] Objective identified
- [ ] Win condition identified
- [ ] Lose condition identified
- [ ] Gameplay flow mapped
- [ ] State transitions mapped
- [ ] Failure/retry/recovery transitions mapped
- [ ] Reset rules identified
- [ ] Preserve/persistence rules identified
- [ ] Level/progression rules identified
- [ ] Enemy/content contracts identified
- [ ] Multiplayer rules identified
- [ ] Multi Arena rules identified
- [ ] Capacity/concurrency/queue rules identified when applicable
- [ ] Material boundaries extracted
- [ ] Player-visible expectations recorded for material mechanics
- [ ] High-risk coexisting systems identified

Bug discovery starts only when `gameplay-model-closure.md` permits it.
