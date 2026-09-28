<script lang="ts">
  export interface RecentMap {
    id: string;
    name: string;
    subtitle: string;
    updated: string;
    state: string;
    tone: "attention" | "warning" | "verified";
  }

  export let maps: readonly RecentMap[];
  export let onOpenMap: (id?: string) => void;
</script>

<main class="library">
  <header class="library-head">
    <div>
      <strong class="product-name">M-Bedrock</strong>
      <h1>Maps</h1>
      <p>Open a Minecraft world to review issues, evidence, and validation.</p>
    </div>
    <button class="primary" on:click={() => onOpenMap()}>Open map</button>
  </header>

  <section class="recent-maps" aria-labelledby="recent-maps-heading">
    <div class="section-title">
      <h2 id="recent-maps-heading">Recent</h2>
    </div>
    <div class="map-list">
      {#each maps as map (map.id)}
        <button class="map-row" on:click={() => onOpenMap(map.id)}>
          <span class="map-icon" aria-hidden="true">{map.name.slice(0, 1)}</span>
          <span class="map-copy">
            <strong>{map.name}</strong>
            <span>{map.subtitle}</span>
          </span>
          <span class="map-meta">
            <small>{map.updated}</small>
            <span class="map-state {map.tone}">{map.state}</span>
          </span>
        </button>
      {/each}
    </div>
  </section>
</main>

<style>
  .library{width:min(920px,calc(100% - 48px));margin:0 auto;padding:44px 0 64px}
  .library-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding-bottom:28px}
  .product-name{display:block;margin-bottom:18px;color:#9aa3ad;font-size:12px}
  .library-head h1{margin:0;font-size:28px;letter-spacing:-.02em}
  .library-head p{margin:6px 0 0;color:#8d969f}
  .primary{min-height:34px;padding:7px 12px;border:1px solid #878fff;border-radius:7px;background:#737cff;color:#0a0c0e;font-weight:650;cursor:pointer}
  .recent-maps{margin-top:8px}
  .section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .section-title h2{margin:0;color:#8f98a1;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
  .map-list{display:grid}
  .map-row{width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 10px;border:0;border-top:1px solid #20252a;background:transparent;color:inherit;text-align:left;cursor:pointer}
  .map-row:hover{background:#11151a}
  .map-icon{width:34px;height:34px;display:grid;place-items:center;border:1px solid #2a3037;border-radius:8px;background:#14181d;color:#cbd1d7;font-weight:700}
  .map-copy{display:grid;gap:2px;min-width:0}
  .map-copy strong{font-size:14px}
  .map-copy span,.map-meta small{color:#848d96;font-size:12px}
  .map-meta{display:grid;justify-items:end;gap:4px}
  .map-state{font-size:11px}
  .map-state.attention{color:#ef868c}.map-state.warning{color:#ddb35a}.map-state.verified{color:#81b394}
  @media(max-width:759px){
    .library{width:calc(100% - 28px);padding:24px 0 40px}
    .library-head{align-items:flex-start;flex-direction:column}
    .library-head .primary{width:100%}
    .map-row{grid-template-columns:36px minmax(0,1fr)}
    .map-meta{grid-column:2;justify-items:start}
  }
</style>
