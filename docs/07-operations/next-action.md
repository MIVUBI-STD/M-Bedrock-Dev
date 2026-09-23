# Next Action

Structure analysis now covers command-block chain topology and inferred placement transforms.

Implemented:

1. command-block facing_direction extraction;
2. conditional_bit extraction from palette states;
3. local chain adjacency;
4. conditional/orphan chain topology diagnostics;
5. local-to-world command-block placement for absolute structure loads;
6. explicit inferred-transform confidence boundary.

Next priority:

1. connect transformed embedded command coordinates to spatial command effects;
2. model always-active/redstone activation and delay constraints;
3. identify chain cycles and broken continuations;
4. then deepen LevelDB/chunk runtime observations;
5. expand Education-specific command/block knowledge after core Bedrock lifecycle coverage.

Do not promote inferred transform coordinates to runtime proof without local game evidence.
