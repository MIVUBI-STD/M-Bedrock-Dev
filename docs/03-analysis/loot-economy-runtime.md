# Loot, Drops, Item Pickup, and Economy Transfer Integrity

## Core problem

Reward delivery can pass through several distinct layers:

```text
death / objective / command
↓
loot generation
↓
dropped item entity OR direct inventory grant
↓
pickup / inventory transfer
↓
currency / progression / objective credit
```

Each layer can succeed or fail independently.

## Reward-source classification

Track sources such as:

- ENGINE_LOOT_TABLE
- LOOT_COMMAND
- SCRIPT_INVENTORY_GRANT
- DROPPED_ITEM_PICKUP
- SCOREBOARD_CURRENCY
- STRUCTURE_CONTAINER
- RECOVERY_REWARD

If two sources represent the same entitlement, arbitration is required.

## Death reward duplication

Bad:

```text
entity dies
├─ engine loot table drops token
└─ script kill handler also gives token
```

If both are intended to represent one reward, this is duplicate delivery.

## Drop ownership

Gameplay drops should be tied to:

```text
arenaGeneration
rewardOperationId
source entity/result
allowed recipient/team
expiry policy
```

so unrelated players or later rounds cannot claim them.

## Pickup transaction

```text
picker/drop observed
↓
validate session + arena/team + generation
↓
reserve rewardOperationId
↓
verify physical pickup / consume path
↓
commit currency or progression
```

Do not increment currency while leaving the same claimable drop available.

## Inventory-full behavior

Define one explicit policy:

- leave remainder
- defer/mailbox
- convert to alternate currency
- reject claim
- compensate

Do not silently treat partial physical delivery as full success.

## Stale drop cleanup

```text
Round N drop
↓
Round N ends
↓
drop invalidated or removed
↓
Round N+1 starts
```

Old drops must not retain valid reward semantics in a new generation.

## Analyzer diagnostics

- LOOT_REWARD_SOURCE_UNDECLARED
- LOOT_DUPLICATE_ENGINE_AND_SCRIPT_REWARD
- LOOT_REWARD_OPERATION_ID_MISSING
- LOOT_DROP_OWNERSHIP_MISSING
- LOOT_CROSS_ARENA_PICKUP
- LOOT_STALE_DROP_PICKUP
- LOOT_PICKUP_SCOPE_UNVALIDATED
- LOOT_PICKUP_CURRENCY_DOUBLE_COMMIT
- LOOT_ITEM_REMAINS_AFTER_CURRENCY_CREDIT
- LOOT_INVENTORY_FULL_POLICY_MISSING
- LOOT_PARTIAL_TRANSFER_COMMITTED
- LOOT_TABLE_REFERENCE_INVALID
- LOOT_TABLE_SCRIPT_REWARD_OVERLAP
- LOOT_DROP_CHUNK_NOT_READY
- LOOT_CLEANUP_RESIDUE

## Review questions

1. What generated this reward?
2. Is there another parallel path granting the same entitlement?
3. Does the drop have arena/generation ownership?
4. Is the picker actually eligible?
5. Can inventory accept the full reward?
6. What happens on partial delivery?
7. Can currency be credited while the item remains claimable?
8. Does round reset invalidate old drops?
9. Are loot-table conditions/path references valid?
10. Can crash/reconnect repeat the reward operation?