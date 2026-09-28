<script lang="ts">
  export type WorkspaceView = "review" | "history";

  export let name: string;
  export let version: string;
  export let target: string;
  export let view: WorkspaceView;
  export let onBack: () => void;
  export let onViewChange: (view: WorkspaceView) => void;
</script>

<header class="mapbar">
  <button class="back" on:click={onBack}>← Maps</button>
  <div class="identity">
    <strong>{name} <span>{version}</span></strong>
    <small>{target}</small>
  </div>
  <nav aria-label="Map views">
    <button class:active={view === "review"} on:click={() => onViewChange("review")}>Review</button>
    <button class:active={view === "history"} on:click={() => onViewChange("history")}>History</button>
  </nav>
  <div class="actions">
    <button class="primary">Analyze</button>
    <button class="icon" aria-label="More map options">•••</button>
  </div>
</header>

<style>
  .mapbar{min-height:84px;display:grid;grid-template-columns:auto minmax(180px,1fr) auto auto;align-items:center;gap:18px;padding:14px 22px;border-bottom:1px solid #20252a;background:#111418}
  .back,.mapbar nav button{border:0;background:transparent;color:#a9b0b8;cursor:pointer}
  .identity{display:grid;gap:2px}
  .identity strong{font-size:17px}
  .identity span,.identity small{color:#858d96;font-weight:500}
  .mapbar nav{display:flex;align-self:end;gap:4px}
  .mapbar nav button{padding:11px 10px}
  .mapbar nav button.active{color:#f1f3f5;border-bottom:2px solid #9ea7ff}
  .actions{display:flex;gap:5px}
  .primary{min-height:34px;padding:7px 12px;border:1px solid #878fff;border-radius:7px;background:#737cff;color:#0a0c0e;font-weight:650;cursor:pointer}
  .icon{width:34px;height:34px;border:0;border-radius:7px;background:transparent;color:#9299a2;cursor:pointer}
  @media(max-width:759px){
    .mapbar{min-height:94px;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"back identity actions" "nav nav nav";gap:6px 10px;padding:9px 12px}
    .back{grid-area:back}.identity{grid-area:identity}.mapbar nav{grid-area:nav;align-self:auto}.actions{grid-area:actions}
    .actions .icon{display:none}.identity strong{font-size:15px}.identity small{font-size:11px}
  }
</style>
