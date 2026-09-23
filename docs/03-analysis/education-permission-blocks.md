# Education Permission Blocks

Structure inspection now recognizes Education specialty permission blocks:

- minecraft:allow
- minecraft:deny
- minecraft:border_block

Counts are derived from the structure palette and are therefore static content evidence.

If any specialty permission block is present, inspection checks the target Education feature profile using the existing compatibility diagnostic owner.

This can produce:

- no diagnostic when Education features are enabled;
- EDUCATION_FEATURE_DISABLED when explicitly disabled;
- EDUCATION_FEATURE_STATE_UNKNOWN when the target feature state is unknown.

## Runtime meaning

Allow and Deny blocks control build/destroy permission regions.

Border blocks create permission-based traversal/build barriers.

The analyzer does not yet reconstruct full permission volumes from world block coordinates. Presence is currently compatibility evidence, not spatial proof of why a player could or could not move/build.
