# Next Action

Current phase: typed command effects and first diagnostics exist.

Next architecture topic: **Coordinate Context + Arena/Topology Analysis**.

Recommended next work:

1. model execution coordinate context separately from raw coordinate tokens;
2. represent absolute world-space regions only when context is provable;
3. add typed `fill/setblock/clone` region queries;
4. identify repeated translated command/structure patterns without declaring them arenas yet;
5. derive candidate topology groups from coordinate offsets + function/structure similarity;
6. add state-scope analysis for selectors, scoreboards and tags;
7. detect likely cross-group/global state collisions;
8. introduce explicit ArenaModel only as a derived view when evidence supports it;
9. then design patch transactions for safe coordinate replication.

This keeps arena support generic enough for non-arena maps while directly supporting the multi-arena defects seen in real projects.
