# Game Design Authority

This directory owns explicit **map- or mode-scoped intended gameplay**.

Game Design answers: **What is this experience supposed to do?**

It does not describe generic Minecraft behavior and it does not impose generic engineering preferences.

## Authority order

```text
approved authored design / client brief
        ↓
approved reconstructed design
        ↓
Gameplay Intent reconstruction
        ↓
Behavior Model / diagnosis
```

Minecraft documentation, global engineering contracts, generic reliability rules, and runtime observations are not Game Design authority.

Project-local design belongs at `workspace/active/<project-id>/design/game-design.json`.
The typed contract is owned by `engine/packages/game-design/`.
