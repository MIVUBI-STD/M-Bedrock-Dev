<script lang="ts">
  import { mockHistory, mockItems, mockMap, type MockReviewItem } from "./mock.js";

  type View = "review" | "history";
  let view: View = "review";
  let selectedId = mockItems[0]?.id ?? "";
  let query = "";
  let filterOpen = false;
  let technicalOpen = false;

  $: selected = mockItems.find((item) => item.id === selectedId) ?? mockItems[0];
  $: filtered = query.trim()
    ? mockItems.filter((item) => [item.title, item.stateLabel, item.proof ?? "", item.severity ?? ""].join(" ").toLowerCase().includes(query.trim().toLowerCase()))
    : mockItems;
  $: attention = filtered.filter((item) => item.section === "attention");
  $: understood = filtered.filter((item) => item.section === "understood");

  function choose(item: MockReviewItem) {
    selectedId = item.id;
    technicalOpen = false;
  }

  function tone(item: MockReviewItem) {
    if (item.state === "confirmed-defect" || item.state === "outdated-proof") return "danger";
    if (item.state === "runtime-test-required" || item.state === "probable-defect") return "warning";
    return "quiet";
  }
</script>

<div class="shell">
  <header class="appbar"><strong>M-Bedrock</strong><button class="icon" aria-label="More application options">•••</button></header>

  <header class="mapbar">
    <button class="back">← Maps</button>
    <div class="identity"><strong>{mockMap.name} <span>{mockMap.version}</span></strong><small>{mockMap.target}</small></div>
    <nav aria-label="Map views">
      <button class:active={view === "review"} on:click={() => (view = "review")}>Review</button>
      <button class:active={view === "history"} on:click={() => (view = "history")}>History</button>
    </nav>
    <div class="actions"><button class="primary">Analyze</button><button class="icon" aria-label="More map options">•••</button></div>
  </header>

  {#if view === "review"}
    <main class="review">
      <aside class="listpane">
        <div class="toolbar">
          <div><h1>Review</h1><p>{attention.length} need attention</p></div>
          <div class="search"><input bind:value={query} placeholder="Search review" aria-label="Search review"/><button class="secondary" on:click={() => (filterOpen = !filterOpen)}>Filter</button></div>
          {#if filterOpen}<div class="filter"><strong>Filter</strong><span>State</span><div><button>Confirmed</button><button>Need evidence</button><button>Outdated</button></div><span>Proof</span><div><button>Live</button><button>Package</button><button>Static</button></div></div>{/if}
        </div>

        <div class="scroll">
          {#if attention.length}<section><h2>Needs attention</h2>{#each attention as item (item.id)}<button class:selected={selectedId === item.id} class="row" on:click={() => choose(item)}><span class="dot {tone(item)}"></span><span class="rowcopy"><strong>{item.title}</strong><span>{item.stateLabel}{item.proof ? ` · ${item.proof}` : ""}</span></span>{#if item.severity === "Critical"}<span class="critical">Critical</span>{/if}</button>{/each}</section>{/if}
          {#if understood.length}<section><h2>Verified / understood</h2>{#each understood as item (item.id)}<button class:selected={selectedId === item.id} class="row" on:click={() => choose(item)}><span class="dot quiet"></span><span class="rowcopy"><strong>{item.title}</strong><span>{item.stateLabel}{item.proof ? ` · ${item.proof}` : ""}</span></span></button>{/each}</section>{/if}
        </div>
      </aside>

      <section class="detailpane">
        {#if selected}<article class="detail">
          <header><h1>{selected.title}</h1><div class="badges">{#if selected.severity}<span>{selected.severity}</span>{/if}<span>{selected.stateLabel}</span>{#if selected.proof}<span>{selected.proof}</span>{/if}</div></header>
          <section><h2>What happened</h2><p>{selected.whatHappened}</p></section>
          <section><h2>Why</h2><p>{selected.why}</p></section>
          {#if selected.proof}<section><h2>Evidence</h2><div class="proof"><b>✓</b><div><strong>{selected.proof}</strong><span>Current proof available for this review item.</span></div></div></section>{/if}
          {#if selected.nextAction}<section class="next"><div><h2>Next action</h2><p>Continue from the safest action supported by the current evidence.</p></div><button class="primary">{selected.nextAction}</button></section>{/if}

          {#if selected.state === "confirmed-defect"}<div class="module"><div><small>Repair</small><strong>Repair available</strong><p>Limit interaction handling to the active build plot without changing unrelated arena behavior.</p></div><button class="secondary">Review repair</button></div>
          {:else if selected.state === "runtime-test-required"}<div class="module warning"><div><small>Validation</small><strong>Multiplayer runtime test required</strong><p>Static evidence is not enough to confirm the reconnect behavior.</p></div></div>
          {:else if selected.state === "outdated-proof"}<div class="module danger"><div><small>Validation</small><strong>This test result is outdated</strong><p>The map changed after this test was run.</p></div></div>{/if}

          <details bind:open={technicalOpen}><summary>Technical details</summary><dl><div><dt>Finding</dt><dd>CROSS_SCOPE_STATE_RISK</dd></div><div><dt>Source</dt><dd>scripts/arena/session.ts</dd></div><div><dt>Proof basis</dt><dd>mock-projection-v1</dd></div></dl></details>
        </article>{/if}
      </section>
    </main>
  {:else}
    <main class="history"><header><h1>History</h1><p>Recent analysis, repairs, and validation for {mockMap.name}.</p></header><h2>Today</h2>{#each mockHistory as event}<article><time>{event.time}</time><div><strong>{event.title}</strong><span>{event.detail}</span></div></article>{/each}</main>
  {/if}
</div>

<style>
  :global(*){box-sizing:border-box}:global(body){margin:0;background:#0c0e10;color:#f1f3f5;font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}:global(button),:global(input){font:inherit}button{cursor:pointer}.shell{min-height:100vh}.appbar{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #20252a;background:#0f1114}.icon{width:34px;height:34px;border:0;border-radius:7px;background:transparent;color:#9299a2}.mapbar{min-height:84px;display:grid;grid-template-columns:auto minmax(180px,1fr) auto auto;align-items:center;gap:18px;padding:14px 22px;border-bottom:1px solid #20252a;background:#111418}.back,.mapbar nav button{border:0;background:transparent;color:#a9b0b8}.identity{display:grid;gap:2px}.identity strong{font-size:17px}.identity span,.identity small{color:#858d96;font-weight:500}.mapbar nav{display:flex;align-self:end;gap:4px}.mapbar nav button{padding:11px 10px}.mapbar nav button.active{color:#f1f3f5;border-bottom:2px solid #9ea7ff}.actions{display:flex;gap:5px}.primary,.secondary{min-height:34px;padding:7px 12px;border-radius:7px;font-weight:650}.primary{border:1px solid #878fff;background:#737cff;color:#0a0c0e}.secondary{border:1px solid #30363d;background:#171b20;color:#d7dbe0}.review{height:calc(100vh - 132px);display:grid;grid-template-columns:minmax(320px,390px) minmax(0,1fr)}.listpane{border-right:1px solid #20252a;display:flex;flex-direction:column;background:#0f1215}.toolbar{position:relative;display:grid;gap:13px;padding:18px;border-bottom:1px solid #20252a}.toolbar h1,.history h1{margin:0;font-size:20px}.toolbar p,.history p{margin:2px 0 0;color:#8b939c;font-size:12px}.search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.search input{height:36px;border:1px solid #2b3138;border-radius:7px;background:#12161a;color:#eef1f4;padding:0 10px}.filter{position:absolute;z-index:10;top:102px;right:18px;width:260px;display:grid;gap:9px;padding:13px;border:1px solid #323942;border-radius:10px;background:#171b20}.filter>span{color:#87909a;font-size:11px}.filter div{display:flex;flex-wrap:wrap;gap:5px}.filter div button{border:1px solid #323943;border-radius:6px;background:#11151a;color:#bbc1c8;padding:5px 8px;font-size:11px}.scroll{overflow:auto;padding:10px}.scroll section h2{margin:13px 8px 7px;color:#858e98;font-size:11px;text-transform:uppercase;letter-spacing:.06em}.row{width:100%;min-height:66px;display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:start;padding:12px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left}.row:hover{background:#15191e}.row.selected{border-color:#303746;background:#181d24}.dot{width:7px;height:7px;margin-top:6px;border-radius:50%;background:#818891}.dot.danger{background:#ef6a72}.dot.warning{background:#dcae4e}.dot.quiet{background:#6fa786}.rowcopy{display:grid;gap:3px;min-width:0}.rowcopy strong{font-size:13px}.rowcopy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#89919a;font-size:11px}.critical{color:#ef868c;font-size:11px}.detailpane{overflow:auto}.detail{width:min(760px,calc(100% - 56px));margin:0 auto;padding:32px 0 54px}.detail>header{display:grid;gap:13px;padding-bottom:24px}.detail h1{margin:0;font-size:26px;line-height:1.2}.badges{display:flex;flex-wrap:wrap;gap:6px}.badges span{padding:4px 7px;border:1px solid #30363d;border-radius:999px;color:#b9c0c7;font-size:11px}.detail>section{padding:21px 0;border-top:1px solid #20252a}.detail h2,.module small{margin:0 0 7px;color:#9098a1;font-size:12px}.detail p,.module p{margin:0;color:#c4c9ce;font-size:14px;line-height:1.62}.proof{display:flex;gap:10px}.proof b{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#14221b;color:#86c69e}.proof div{display:grid;gap:2px}.proof span{color:#868f98;font-size:12px}.next{display:flex;align-items:center;justify-content:space-between;gap:24px}.module{margin:16px 0;padding:15px 16px;display:flex;justify-content:space-between;gap:20px;border:1px solid #2a3139;border-radius:9px;background:#11151a}.module>div{display:grid;gap:3px}.module p{color:#8f98a1;font-size:12px}.module.warning{border-color:#554722;background:#18150d}.module.danger{border-color:#5a3035;background:#1a1113}details{margin-top:24px;padding-top:18px;border-top:1px solid #20252a}summary{color:#8f98a1;font-size:12px}dl{display:grid;gap:7px;padding:12px;border:1px solid #252b31;border-radius:8px;background:#101317}dl div{display:grid;grid-template-columns:120px 1fr;gap:12px}dt{color:#77808a;font-size:11px}dd{margin:0;color:#bcc3ca;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.history{width:min(860px,calc(100% - 48px));margin:0 auto;padding:34px 0}.history h2{color:#8c949e;font-size:12px}.history article{display:grid;grid-template-columns:64px 1fr;gap:16px;padding:15px 0;border-top:1px solid #20252a}.history article div{display:grid;gap:2px}.history article span,.history time{color:#8e969f;font-size:12px}@media(max-width:900px){.review{grid-template-columns:320px minmax(0,1fr)}.detail{width:calc(100% - 40px)}}@media(max-width:759px){.appbar{display:none}.mapbar{min-height:72px;padding:10px 14px}.review{height:calc(100vh - 72px);grid-template-columns:1fr}.detailpane{display:none}.history{width:calc(100% - 32px)}}
</style>
