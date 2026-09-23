# Mount, Ride, Vehicle, and Passenger Lifecycle Integrity

## Core problem

Mounted state is a relationship, not just a location.

Track rider, vehicle, seat, controlling seat, arena generation, and lifecycle boundaries.

## Critical transitions

- mount
- dismount
- mounted teleport
- vehicle despawn/death
- rider death/respawn
- disconnect/reconnect
- arena reset

## Analyzer diagnostics

- MOUNT_RELATIONSHIP_AUTHORITY_MISSING
- MOUNT_STALE_RIDER_RELATION
- MOUNT_SEAT_OWNERSHIP_CONFLICT
- MOUNT_RIDER_VEHICLE_TELEPORT_DESYNC
- MOUNT_RESET_REMOVES_VEHICLE_BEFORE_RIDER
- MOUNT_UNSAFE_DISMOUNT_LOCATION
- MOUNT_CROSS_ARENA_CONTAINMENT_LEAK
- MOUNT_RECONNECT_RESUMES_STALE_RELATION
