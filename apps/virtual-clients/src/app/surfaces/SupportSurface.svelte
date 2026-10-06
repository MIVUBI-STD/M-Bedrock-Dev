<script lang="ts">
  import type { EngineSnapshot, HealthIssue, OperationRecord } from "../../contracts.js";
  import { issueLabel } from "../../view-model.js";

  export let snapshot: EngineSnapshot;
  export let issues: HealthIssue[];
  export let blockers: HealthIssue[];
  export let warnings: HealthIssue[];
  export let history: readonly OperationRecord[];
  export let busy: string;
  export let onCreateSupportBundle: () => void | Promise<void>;

  let historyOpen = false;
  let diagnosticsOpen = false;
</script>

<section class="hero compact">
  <span class="eyebrow">HELP & SUPPORT</span>
  <h2>{blockers.length === 0 ? "System looks good" : "Some items need attention"}</h2>
  <p>Normal use stays simple. Technical details are available here only when you need them.</p>
</section>

<section class="support-summary">
  <article><span>System</span><strong>{blockers.length === 0 ? "Ready" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}</strong></article>
  <article><span>Available memory</span><strong>{Math.round(snapshot.diagnostics.host.availableMemoryMb / 1024)} GB</strong></article>
  <article><span>Resource pressure</span><strong>{snapshot.diagnostics.runtime.pressure.level}</strong></article>
  <article><span>Virtualization</span><strong>{snapshot.doctor.provider ?? "Unavailable"}</strong></article>
</section>

<section class="support-card">
  <header><div><span class="eyebrow">WHAT NEEDS ATTENTION</span><h3>{blockers.length} blockers · {warnings.length} warnings</h3></div></header>
  {#if issues.length === 0}
    <div class="healthy-empty"><strong>Everything is ready</strong><span>No backend blocker or warning is currently reported.</span></div>
  {:else}
    <div class="issue-list">
      {#each issues as issue}
        <div class="issue {issue.severity.toLowerCase()}"><b>{issue.severity === "BLOCKER" ? "ACTION" : "CHECK"}</b><span>{issueLabel(issue)}</span></div>
      {/each}
    </div>
  {/if}
</section>

<section class="support-tools">
  <button class="tool-card" on:click={() => (historyOpen = !historyOpen)}><strong>Operation history</strong><span>See recent starts, stops, restores, and failures.</span></button>
  <button class="tool-card" on:click={() => (diagnosticsOpen = !diagnosticsOpen)}><strong>Technical details</strong><span>View CPU, memory, identities, and backend status.</span></button>
  <button class="tool-card" disabled={busy === "support"} on:click={onCreateSupportBundle}><strong>{busy === "support" ? "Creating…" : "Create support bundle"}</strong><span>Generate a safe diagnostic package for troubleshooting.</span></button>
</section>

{#if historyOpen}
  <section class="history-panel">
    <header><strong>Recent operations</strong></header>
    {#if history.length === 0}
      <div class="empty">No recorded operations.</div>
    {:else}
      {#each [...history].reverse().slice(0, 40) as item}
        <div class="history-row"><time>{new Date(item.timestampUnixMs).toLocaleString()}</time><strong>{item.operation}</strong><span>{item.target ?? "—"}</span><b class:failed={item.outcome === "FAILED"}>{item.outcome}</b></div>
      {/each}
    {/if}
  </section>
{/if}

{#if diagnosticsOpen}
  <section class="diagnostics-panel">
    <div><span>CPU</span><strong>{snapshot.diagnostics.host.logicalCpus} logical processors</strong></div>
    <div><span>Memory</span><strong>{Math.round(snapshot.diagnostics.host.availableMemoryMb / 1024)} / {Math.round(snapshot.diagnostics.host.totalMemoryMb / 1024)} GB available</strong></div>
    <div><span>Provider</span><strong>{snapshot.diagnostics.provider.id ?? "Unavailable"} {snapshot.diagnostics.provider.version ?? ""}</strong></div>
    <div><span>Base state</span><strong>{snapshot.doctor.baseState ?? "Unknown"}</strong></div>
    <div><span>Version parity</span><strong>{snapshot.diagnostics.runtime.runtimeProfile.parity}</strong></div>
  </section>
{/if}
