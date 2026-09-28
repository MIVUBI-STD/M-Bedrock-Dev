<script lang="ts">
  import type { ReviewUiItem } from "../view-model.js";

  export let attention: readonly ReviewUiItem[];
  export let understood: readonly ReviewUiItem[];
  export let filteredCount: number;
  export let selectedId: string;
  export let onSelect: (item: ReviewUiItem) => void;

  function tone(item: ReviewUiItem) {
    if (item.state === "confirmed-defect" || item.state === "outdated-proof") return "danger";
    if (item.state === "runtime-test-required" || item.state === "probable-defect") return "warning";
    return "quiet";
  }
</script>

<div class="scroll">
  {#if attention.length}
    <section>
      <h2>Needs attention</h2>
      {#each attention as item (item.id)}
        <button class:selected={selectedId === item.id} class="row" on:click={() => onSelect(item)}>
          <span class="dot {tone(item)}"></span>
          <span class="rowcopy">
            <strong>{item.title}</strong>
            <span>{item.stateLabel}{item.proof ? ` · ${item.proof}` : ""}</span>
          </span>
          {#if item.severity === "Critical"}<span class="critical">Critical</span>{/if}
        </button>
      {/each}
    </section>
  {/if}

  {#if understood.length}
    <section>
      <h2>Verified / understood</h2>
      {#each understood as item (item.id)}
        <button class:selected={selectedId === item.id} class="row" on:click={() => onSelect(item)}>
          <span class="dot quiet"></span>
          <span class="rowcopy">
            <strong>{item.title}</strong>
            <span>{item.stateLabel}{item.proof ? ` · ${item.proof}` : ""}</span>
          </span>
        </button>
      {/each}
    </section>
  {/if}

  {#if filteredCount === 0}
    <div class="empty-list">
      <strong>No matching review items</strong>
      <span>Try a different search or filter.</span>
    </div>
  {/if}
</div>

<style>
  .scroll{overflow:auto;padding:10px}
  section h2{margin:13px 8px 7px;color:#858e98;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
  .row{width:100%;min-height:66px;display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:start;padding:12px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer}
  .row:hover{background:#15191e}.row.selected{border-color:#303746;background:#181d24}
  .dot{width:7px;height:7px;margin-top:6px;border-radius:50%;background:#818891}
  .dot.danger{background:#ef6a72}.dot.warning{background:#dcae4e}.dot.quiet{background:#6fa786}
  .rowcopy{display:grid;gap:3px;min-width:0}.rowcopy strong{font-size:13px}
  .rowcopy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#89919a;font-size:11px}
  .critical{color:#ef868c;font-size:11px}
  .empty-list{display:grid;gap:4px;padding:24px 10px;color:#89919a}
  .empty-list strong{color:#c7ccd1;font-size:13px}.empty-list span{font-size:12px}
</style>
