# NPC and Dialogue Lifecycle Integrity

## Core problem

NPC dialogue is both UI and command automation.

## Required model

NPC identity + player session + scene + arena generation + dialogue generation.

## Analyzer diagnostics

- NPC_DIALOGUE_SESSION_OWNER_MISSING
- NPC_DIALOGUE_STALE_RESPONSE
- NPC_DIALOGUE_CROSS_ARENA_TARGET
- NPC_DIALOGUE_COMMAND_SCOPE_UNSAFE
- NPC_DIALOGUE_DUPLICATE_TRANSACTION_PATH
- NPC_STRUCTURE_RESTORE_DUPLICATE
- NPC_DIALOGUE_RESET_NOT_INVALIDATED
