<script lang="ts">
  import type { MockReviewItem } from "../mock.js";

  export let item: MockReviewItem | undefined;
  export let open: boolean;
  export let technicalOpen: boolean;
  export let onBack: () => void;
</script>

<section class:open class="detailpane">
  {#if item}
    <article class="detail">
      <button class="mobile-detail-back" on:click={onBack}>← Review</button>
      <header>
        <h1>{item.title}</h1>
        <div class="badges">
          {#if item.severity}<span>{item.severity}</span>{/if}
          <span>{item.stateLabel}</span>
          {#if item.proof}<span>{item.proof}</span>{/if}
        </div>
      </header>

      <section><h2>What happened</h2><p>{item.whatHappened}</p></section>
      <section><h2>Why</h2><p>{item.why}</p></section>

      {#if item.proof}
        <section>
          <h2>Evidence</h2>
          <div class="proof" class:stale={item.state === "outdated-proof"}>
            <b>{item.state === "outdated-proof" ? "!" : "✓"}</b>
            <div>
              <strong>{item.proof}</strong>
              <span>{item.state === "outdated-proof"
                ? "Previous proof exists, but it is no longer current for this map."
                : "Current proof available for this review item."}</span>
            </div>
          </div>
        </section>
      {/if}

      {#if item.nextAction}
        <section class="next">
          <div>
            <h2>Next action</h2>
            <p>Continue from the safest action supported by the current evidence.</p>
          </div>
          <button class="primary">{item.nextAction}</button>
        </section>
      {/if}

      {#if item.state === "confirmed-defect"}
        <div class="module">
          <div><small>Repair</small><strong>Repair available</strong><p>Limit interaction handling to the active build plot without changing unrelated arena behavior.</p></div>
        </div>
      {:else if item.state === "runtime-test-required"}
        <div class="module warning">
          <div><small>Validation</small><strong>Multiplayer runtime test required</strong><p>Static evidence is not enough to confirm the reconnect behavior.</p></div>
        </div>
      {:else if item.state === "outdated-proof"}
        <div class="module danger">
          <div><small>Validation</small><strong>This test result is outdated</strong><p>The map changed after this test was run.</p></div>
        </div>
      {/if}

      {#if item.technical}
        <details bind:open={technicalOpen}>
          <summary>Technical details</summary>
          <dl>
            <div><dt>Finding</dt><dd>{item.technical.finding}</dd></div>
            <div><dt>Source</dt><dd>{item.technical.source}</dd></div>
            <div><dt>Proof basis</dt><dd>{item.technical.proofBasis}</dd></div>
          </dl>
        </details>
      {/if}
    </article>
  {:else}
    <div class="empty-detail">
      <strong>Nothing selected</strong>
      <span>Choose a review item to see its details.</span>
    </div>
  {/if}
</section>

<style>
  .detailpane{overflow:auto}.detail{width:min(760px,calc(100% - 56px));margin:0 auto;padding:32px 0 54px}
  .detail>header{display:grid;gap:13px;padding-bottom:24px}.detail h1{margin:0;font-size:26px;line-height:1.2}
  .badges{display:flex;flex-wrap:wrap;gap:6px}.badges span{padding:4px 7px;border:1px solid #30363d;border-radius:999px;color:#b9c0c7;font-size:11px}
  .detail>section{padding:21px 0;border-top:1px solid #20252a}.detail h2,.module small{margin:0 0 7px;color:#9098a1;font-size:12px}
  .detail p,.module p{margin:0;color:#c4c9ce;font-size:14px;line-height:1.62}
  .proof{display:flex;gap:10px}.proof b{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:#14221b;color:#86c69e}
  .proof.stale b{background:#281b0e;color:#e0b562}.proof div{display:grid;gap:2px}.proof span{color:#868f98;font-size:12px}
  .next{display:flex;align-items:center;justify-content:space-between;gap:24px}
  .primary{min-height:34px;padding:7px 12px;border:1px solid #878fff;border-radius:7px;background:#737cff;color:#0a0c0e;font-weight:650;cursor:pointer}
  .module{margin:16px 0;padding:15px 16px;display:flex;justify-content:space-between;gap:20px;border:1px solid #2a3139;border-radius:9px;background:#11151a}
  .module>div{display:grid;gap:3px}.module p{color:#8f98a1;font-size:12px}.module.warning{border-color:#554722;background:#18150d}.module.danger{border-color:#5a3035;background:#1a1113}
  details{margin-top:24px;padding-top:18px;border-top:1px solid #20252a}summary{color:#8f98a1;font-size:12px;cursor:pointer}
  dl{display:grid;gap:7px;padding:12px;border:1px solid #252b31;border-radius:8px;background:#101317}
  dl div{display:grid;grid-template-columns:120px 1fr;gap:12px}dt{color:#77808a;font-size:11px}dd{margin:0;color:#bcc3ca;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
  .mobile-detail-back{display:none;border:0;background:transparent;color:#a9b0b8;padding:0 0 18px;cursor:pointer}
  .empty-detail{display:grid;gap:4px;place-content:center;min-height:280px;text-align:center;color:#89919a}
  .empty-detail strong{color:#c7ccd1;font-size:13px}.empty-detail span{font-size:12px}
  @media(max-width:900px){.detail{width:calc(100% - 40px)}}
  @media(max-width:759px){
    .detailpane{display:none}.detailpane.open{display:block;position:fixed;z-index:20;inset:0;overflow:auto;background:#0c0e10}
    .mobile-detail-back{display:inline-flex}.detail{width:calc(100% - 32px);padding-top:20px}.next{align-items:flex-start;flex-direction:column}.next .primary{width:100%}
  }
</style>
