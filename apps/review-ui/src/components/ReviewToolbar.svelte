<script lang="ts">
  export type ReviewFilter = "all" | "attention" | "understood";

  export let attentionCount: number;
  export let query: string;
  export let filterOpen: boolean;
  export let activeFilter: ReviewFilter;
</script>

<div class="toolbar">
  <div>
    <h1>Review</h1>
    <p>{attentionCount} need attention</p>
  </div>
  <div class="search">
    <input bind:value={query} placeholder="Search review" aria-label="Search review"/>
    <button class="secondary" on:click={() => (filterOpen = !filterOpen)}>Filter</button>
  </div>
  {#if filterOpen}
    <div class="filter">
      <strong>Show</strong>
      <div>
        <button class:active={activeFilter === "all"} on:click={() => (activeFilter = "all")}>All</button>
        <button class:active={activeFilter === "attention"} on:click={() => (activeFilter = "attention")}>Needs attention</button>
        <button class:active={activeFilter === "understood"} on:click={() => (activeFilter = "understood")}>Verified / understood</button>
      </div>
      <button class="filter-done" on:click={() => (filterOpen = false)}>Done</button>
    </div>
  {/if}
</div>

<style>
  .toolbar{position:relative;display:grid;gap:13px;padding:18px;border-bottom:1px solid #20252a}
  .toolbar h1{margin:0;font-size:20px}.toolbar p{margin:2px 0 0;color:#8b939c;font-size:12px}
  .search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
  .search input{height:36px;border:1px solid #2b3138;border-radius:7px;background:#12161a;color:#eef1f4;padding:0 10px}
  .secondary{min-height:34px;padding:7px 12px;border:1px solid #30363d;border-radius:7px;background:#171b20;color:#d7dbe0;font-weight:650;cursor:pointer}
  .filter{position:absolute;z-index:10;top:102px;right:18px;width:260px;display:grid;gap:9px;padding:13px;border:1px solid #323942;border-radius:10px;background:#171b20}
  .filter div{display:flex;flex-wrap:wrap;gap:5px}
  .filter div button{border:1px solid #323943;border-radius:6px;background:#11151a;color:#bbc1c8;padding:5px 8px;font-size:11px;cursor:pointer}
  .filter div button.active{border-color:#6e78de;background:#1c2130;color:#eef1ff}
  .filter-done{justify-self:end;border:0;background:transparent;color:#aeb6ff;padding:4px 0;cursor:pointer}
</style>
