<script lang="ts">
  import MapHeader, { type WorkspaceView } from "./components/MapHeader.svelte";
  import MapLibrary from "./components/MapLibrary.svelte";
  import ReviewToolbar, { type ReviewFilter } from "./components/ReviewToolbar.svelte";
  import ReviewList from "./components/ReviewList.svelte";
  import ReviewDetail from "./components/ReviewDetail.svelte";
  import HistoryView from "./components/HistoryView.svelte";
  import { mockHistory, mockMap, mockRecentMaps } from "./mock.js";
  import { reviewProjectionFixture } from "./review-projection-fixture.js";
  import { buildReviewUiViewModel, type ReviewUiItem } from "./view-model.js";

  type AppScreen = "library" | "workspace";

  let screen: AppScreen = "library";
  let view: WorkspaceView = "review";
  const reviewModel = buildReviewUiViewModel(reviewProjectionFixture);
  const reviewItems = reviewModel.items;

  let selectedId = reviewItems[0]?.id ?? "";
  let query = "";
  let filterOpen = false;
  let activeFilter: ReviewFilter = "all";
  let technicalOpen = false;
  let detailOpen = false;

  $: selected = reviewItems.find((item) => item.id === selectedId) ?? reviewItems[0];
  $: filteredByQuery = query.trim()
    ? reviewItems.filter((item) =>
        [item.title, item.stateLabel, item.severity ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : reviewItems;
  $: filtered = activeFilter === "all"
    ? filteredByQuery
    : filteredByQuery.filter((item) => item.section === activeFilter);
  $: attention = filtered.filter((item) => item.section === "attention");
  $: understood = filtered.filter((item) => item.section === "understood");

  $: if (filtered.length > 0 && !filtered.some((item) => item.id === selectedId)) {
    selectedId = filtered[0]!.id;
    technicalOpen = false;
  }

  $: if (filtered.length === 0) {
    selectedId = "";
    detailOpen = false;
  }

  function choose(item: ReviewUiItem) {
    selectedId = item.id;
    technicalOpen = false;
    detailOpen = true;
  }

  function openMap() {
    screen = "workspace";
    view = "review";
    detailOpen = false;
  }

  function backToMaps() {
    screen = "library";
    detailOpen = false;
    filterOpen = false;
  }
</script>

<div class="shell">
  {#if screen === "library"}
    <MapLibrary maps={mockRecentMaps} onOpenMap={openMap} />
  {:else}
    <MapHeader
      name={mockMap.name}
      version={mockMap.version}
      target={reviewModel.artifact.targetLabel}
      {view}
      onBack={backToMaps}
      onViewChange={(next) => (view = next)}
    />

    {#if view === "review"}
      <main class="review">
        <aside class="listpane">
          <ReviewToolbar
            attentionCount={attention.length}
            bind:query
            bind:filterOpen
            bind:activeFilter
          />
          <ReviewList
            {attention}
            {understood}
            filteredCount={filtered.length}
            {selectedId}
            onSelect={choose}
          />
        </aside>

        <ReviewDetail
          item={selected}
          open={detailOpen}
          bind:technicalOpen
          onBack={() => (detailOpen = false)}
        />
      </main>
    {:else}
      <HistoryView mapName={mockMap.name} events={mockHistory} />
    {/if}
  {/if}
</div>

<style>
  :global(*){box-sizing:border-box}
  :global(body){margin:0;background:#0c0e10;color:#f1f3f5;font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  :global(button),:global(input){font:inherit}
  .shell{min-height:100vh}
  .review{height:calc(100vh - 84px);display:grid;grid-template-columns:minmax(320px,390px) minmax(0,1fr)}
  .listpane{min-width:0;border-right:1px solid #20252a;display:flex;flex-direction:column;background:#0f1215}
  @media(max-width:900px){.review{grid-template-columns:320px minmax(0,1fr)}}
  @media(max-width:759px){.review{height:calc(100vh - 94px);grid-template-columns:1fr}}
</style>
