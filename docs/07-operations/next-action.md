# Next Action

Script API intelligence is now usage-driven at event-symbol granularity.

Implemented:

1. event-symbol matrix separate from broad capability minima;
2. corrected over-broad system.afterEvents version assumption;
3. stable recognition for playerBreakBlock, startup/shutdown and scriptEventReceive;
4. pre-release recognition for current 2.12 beta event additions;
5. SCRIPT_API_PRERELEASE_SYMBOL diagnostics;
6. stable-vs-beta manifest cross-checking;
7. official changelog/source provenance for every symbol rule.

Next priority:

1. ingest additional event symbols only when found in real map scripts;
2. add function/method symbols with explicit changelog evidence;
3. correlate symbol changes with Minecraft update regression reports;
4. add deprecated/removed symbol states when official changelogs document them;
5. avoid broad API inventory generation.

Usage-driven expansion remains the default to keep the matrix maintainable and low-noise.
