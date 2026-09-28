<script lang="ts">
  export interface HistoryEvent {
    time: string;
    title: string;
    detail: string;
  }

  export let mapName: string;
  export let events: readonly HistoryEvent[];
</script>

<main class="history">
  <header>
    <h1>History</h1>
    <p>Recent analysis, repairs, and validation for {mapName}.</p>
  </header>
  <h2>Today</h2>
  {#each events as event}
    <article>
      <time>{event.time}</time>
      <div><strong>{event.title}</strong><span>{event.detail}</span></div>
    </article>
  {/each}
</main>

<style>
  .history{width:min(860px,calc(100% - 48px));margin:0 auto;padding:34px 0}
  .history h1{margin:0;font-size:20px}.history header p{margin:2px 0 0;color:#8b939c;font-size:12px}
  .history h2{color:#8c949e;font-size:12px}
  .history article{display:grid;grid-template-columns:64px 1fr;gap:16px;padding:15px 0;border-top:1px solid #20252a}
  .history article div{display:grid;gap:2px}.history article span,.history time{color:#8e969f;font-size:12px}
  @media(max-width:759px){.history{width:calc(100% - 32px)}}
</style>
