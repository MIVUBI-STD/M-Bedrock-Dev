<script lang="ts">
  import type {
    ReviewHistoryEvent,
  } from "../runtime-client.js";

  export interface HistoryPreviewEvent {
    time: string;
    title: string;
    detail: string;
  }

  export let mapName: string;
  export let runtimeEvents:
    readonly ReviewHistoryEvent[] = [];
  export let previewEvents:
    readonly HistoryPreviewEvent[] = [];
  export let runtimeMode = false;
  export let error = "";

  function titleFor(
    event: ReviewHistoryEvent,
  ): string {
    switch (event.trigger) {
      case "file-open":
        return "Map opened and analyzed";
      case "recent-open":
        return "Recent map analyzed";
      case "reanalysis":
        return "Analysis completed";
      case "configured-artifact":
        return "Configured map analyzed";
    }
  }

  function detailFor(
    event: ReviewHistoryEvent,
  ): string {
    const attention = event.attentionCount === 0
      ? "No items need attention"
      : event.attentionCount +
        (event.attentionCount === 1
          ? " item needs attention"
          : " items need attention");
    return attention + " · " + event.targetLabel;
  }

  function timeFor(value: string): string {
    return new Date(value).toLocaleString();
  }
</script>

<main class="history">
  <header>
    <h1>History</h1>
    <p>
      {runtimeMode
        ? "Recorded analysis activity for " + mapName + "."
        : "Preview history for " + mapName + "."}
    </p>
  </header>

  {#if runtimeMode}
    {#if error}
      <div class="history-error" role="alert">
        <strong>History could not load</strong>
        <span>{error}</span>
      </div>
    {:else if runtimeEvents.length > 0}
      <h2>Recent</h2>
      {#each runtimeEvents as event (event.id)}
        <article>
          <time>{timeFor(event.occurredAt)}</time>
          <div>
            <strong>{titleFor(event)}</strong>
            <span>{detailFor(event)}</span>
          </div>
        </article>
      {/each}
    {:else}
      <div class="empty">
        <strong>No recorded history yet</strong>
        <span>Run an analysis to create the first history event.</span>
      </div>
    {/if}
  {:else}
    <h2>Preview</h2>
    {#each previewEvents as event}
      <article>
        <time>{event.time}</time>
        <div><strong>{event.title}</strong><span>{event.detail}</span></div>
      </article>
    {/each}
  {/if}
</main>

<style>
  .history{width:min(860px,calc(100% - 48px));margin:0 auto;padding:34px 0}
  .history h1{margin:0;font-size:20px}
  .history header p{margin:2px 0 0;color:#8b939c;font-size:12px}
  .history h2{margin:30px 0 8px;color:#8c949e;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
  .history article{display:grid;grid-template-columns:170px minmax(0,1fr);gap:16px;padding:15px 0;border-top:1px solid #20252a}
  .history article div{display:grid;gap:2px}
  .history article span,.history time{color:#8e969f;font-size:12px}
  .history-error{display:grid;gap:3px;margin-top:24px;padding:12px 14px;border:1px solid #5a3035;border-radius:9px;background:#1a1113;color:#d6a2a6}.history-error strong{color:#efb1b5;font-size:13px}.history-error span{font-size:12px}.empty{display:grid;gap:4px;margin-top:24px;padding:22px 0;border-top:1px solid #20252a;color:#858e97}
  .empty strong{color:#c4c9ce;font-size:13px}.empty span{font-size:12px}
  @media(max-width:759px){
    .history{width:calc(100% - 32px)}
    .history article{grid-template-columns:1fr;gap:4px}
  }
</style>
