# Inventory, Equipment, and Item Transaction Integrity

## Core problem

A kit or item operation is not one mutation.

```text
select kit
↓
clear old scoped items
↓
clear/replace equipment
↓
grant new items
↓
equip required slots
↓
verify
↓
commit loadout state
```

If any stage is skipped, stale or duplicate state can survive.

## Loadout transaction

```text
SNAPSHOT / PLAN
↓
CLEAR_OR_REPLACE
↓
APPLY
↓
VERIFY
↓
COMMIT

failure
↓
COMPENSATE / RECONCILE
```

Selecting a kit does not itself prove the player's inventory now matches that kit.

## Inventory and equipment are separate

A player can have:

```text
inventory container
equipment slots
offhand
special item metadata
durability/custom state
```

Clearing the main inventory while leaving armor/offhand/equipment can leak the old loadout into the next round.

## Item copy hazard

`getItem()` returns an ItemStack copy.

Bad mental model:

```text
item = slot.getItem()
item modified
therefore slot modified
```

Required:

```text
read current slot
↓
modify copy
↓
revalidate session/generation/slot
↓
write back
↓
verify
```

## Respawn double-restore hazard

Bad:

```text
death handler grants kit
respawn handler grants kit
arena recovery grants kit
↓
duplicates
```

Use one restore owner per life generation.

## Shop transaction

```text
validate current player/session
validate price/currency
reserve or commit payment
apply item/upgrade
verify inventory/equipment result
commit purchase
```

Partial states such as paid-without-item or free-item-after-payment-failure require compensation/recovery.

## Item identity

Do not always deduplicate by `typeId` only.

Special items may differ by:

- amount
- durability
- name/lore
- enchantments/components
- dynamic/custom properties
- project ownership token

## Analyzer diagnostics

- INVENTORY_STALE_CONTAINER_HANDLE
- INVENTORY_STALE_SLOT_HANDLE
- INVENTORY_ITEM_COPY_NOT_WRITTEN_BACK
- INVENTORY_RESET_PARTIAL
- INVENTORY_EQUIPMENT_NOT_RESET
- INVENTORY_OLD_KIT_LEAK
- INVENTORY_DUPLICATE_KIT_GRANT
- INVENTORY_RESPAWN_DOUBLE_RESTORE
- INVENTORY_GRANT_RESULT_UNVERIFIED
- INVENTORY_PURCHASE_PARTIAL_COMMIT
- INVENTORY_PAID_NO_ITEM
- INVENTORY_FREE_ITEM_ON_FAILED_PAYMENT
- INVENTORY_ITEM_IDENTITY_TOO_WEAK
- INVENTORY_SCOPE_OWNERSHIP_MISSING
- INVENTORY_MULTIPLE_RESET_OWNERS

## Review questions

1. Who owns this reset/grant?
2. What generation owns it?
3. Are inventory and equipment both reconciled?
4. Is the slot/container handle still current?
5. Was an ItemStack copy written back?
6. Is the grant idempotent?
7. Can respawn/reconnect retry the same grant?
8. What proves the final loadout is correct?
9. What happens if payment succeeds but grant fails?
10. Can reset remove only items owned by the ending scope?
