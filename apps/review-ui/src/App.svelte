<script lang="ts">
  import { onMount } from "svelte";
  import MapHeader, { type WorkspaceView } from "./components/MapHeader.svelte";
  import MapLibrary from "./components/MapLibrary.svelte";
  import ReviewToolbar, { type ReviewFilter } from "./components/ReviewToolbar.svelte";
  import ReviewList from "./components/ReviewList.svelte";
  import ReviewDetail from "./components/ReviewDetail.svelte";
  import HistoryView from "./components/HistoryView.svelte";
  import { mockHistory, mockMap, mockRecentMaps } from "./mock.js";
  import { reviewProjectionFixture } from "./review-projection-fixture.js";
  import { buildReviewUiViewModel, type ReviewUiItem } from "./view-model.js";
  import { createReviewRuntimeClient, type ReviewRecentArtifact } from "./runtime-client.js";
  import { ReviewRuntimeController, type ReviewRuntimeState } from "./runtime-controller.js";

  type AppScreen = "library" | "workspace";

  let screen: AppScreen = "library";
  let view: WorkspaceView = "review";
  const fixtureModel = buildReviewUiViewModel(reviewProjectionFixture);
  const runtimeController = new ReviewRuntimeController(
    createReviewRuntimeClient(),
    fixtureModel,
  );

  let runtimeState: ReviewRuntimeState = runtimeController.state();
  let recentMode: "recent" | "examples" = "examples";
  let recentArtifacts: readonly ReviewRecentArtifact[] = [];
  let libraryBusy = false;
  let libraryError = "";
  let activeMapName = mockMap.name;
  let activeMapVersion = mockMap.version;
  let reviewModel = fixtureModel;

  $: recentMaps = recentArtifacts.map((item) => ({
    id: item.id,
    name: item.label.replace(/\.(mcworld|zip)$/i, ""),
    subtitle: item.targetLabel,
    updated: "Updated " + new Date(item.updatedAt).toLocaleString(),
    state: item.available
      ? item.attentionCount > 0
        ? item.attentionCount + " need attention"
        : "No current issues need attention"
      : "Local copy unavailable",
    tone: item.available
      ? item.attentionCount > 0
        ? "attention" as const
        : "verified" as const
      : "unavailable" as const,
    available: item.available,
  }));
  $: libraryMaps =
    recentMode === "recent" ? recentMaps : mockRecentMaps;
  $: reviewItems = reviewModel.items;

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

  function openExampleMap() {
    activeMapName = mockMap.name;
    activeMapVersion = mockMap.version;
    reviewModel = fixtureModel;
    selectedId = reviewModel.items[0]?.id ?? "";
    libraryError = "";
    screen = "workspace";
    view = "review";
    detailOpen = false;
  }

  async function refreshRecent() {
    try {
      recentArtifacts = await runtimeController.recent();
      recentMode = "recent";
    } catch {
      recentMode = "examples";
    }
  }

  async function openRecent(id: string) {
    const recent = recentArtifacts.find(
      (item) => item.id === id,
    );
    if (!recent || !recent.available) {
      libraryError =
        "This recent map is no longer available. Open the original file again.";
      return;
    }

    libraryBusy = true;
    libraryError = "";
    const pending = runtimeController.analyzeRecent(
      recent,
    );
    runtimeState = runtimeController.state();
    const next = await pending;
    runtimeState = next;
    libraryBusy = false;

    if (next.phase === "ready") {
      reviewModel = next.model;
      activeMapName = recent.label.replace(
        /\.(mcworld|zip)$/i,
        "",
      );
      activeMapVersion = "";
      selectedId = reviewModel.items[0]?.id ?? "";
      query = "";
      activeFilter = "all";
      technicalOpen = false;
      detailOpen = false;
      screen = "workspace";
      view = "review";
      await refreshRecent();
      return;
    }

    if (next.phase === "error") {
      libraryError = next.message;
      await refreshRecent();
    }
  }

  function openLibraryMap(id: string) {
    if (recentMode === "recent") {
      void openRecent(id);
      return;
    }
    openExampleMap();
  }

  async function openFile(file: File) {
    libraryBusy = true;
    libraryError = "";

    const pending = runtimeController.analyzeFile(file);
    runtimeState = runtimeController.state();
    const next = await pending;
    runtimeState = next;
    libraryBusy = false;

    if (next.phase === "ready") {
      reviewModel = next.model;
      activeMapName = file.name.replace(/\.(mcworld|zip)$/i, "");
      activeMapVersion = "";
      selectedId = reviewModel.items[0]?.id ?? "";
      query = "";
      activeFilter = "all";
      technicalOpen = false;
      detailOpen = false;
      screen = "workspace";
      view = "review";
      return;
    }

    if (next.phase === "error") {
      libraryError = next.message;
    }
  }

  async function analyze() {
    const pending = runtimeController.analyze();
    runtimeState = runtimeController.state();

    const next = await pending;
    runtimeState = next;

    if (next.model) {
      reviewModel = next.model;
      const stillPresent = reviewModel.items.some(
        (item) => item.id === selectedId,
      );
      if (!stillPresent) {
        selectedId = reviewModel.items[0]?.id ?? "";
        detailOpen = false;
        technicalOpen = false;
      }
    }
  }

  function backToMaps() {
    screen = "library";
    detailOpen = false;
    filterOpen = false;
  }

  onMount(() => {
    void runtimeController.discover().then(async (next) => {
      runtimeState = next;
      if (next.info?.uploadSupported) {
        await refreshRecent();
      }
    });
  });
</script>

<div class="shell">
  {#if screen === "library"}
    <MapLibrary
      maps={libraryMaps}
      mode={recentMode}
      onOpenMap={openLibraryMap}
      onOpenFile={openFile}
      busy={libraryBusy}
      error={libraryError}
    />
  {:else}
    <MapHeader
      name={activeMapName}
      version={activeMapVersion}
      target={reviewModel.artifact.targetLabel}
      {view}
      onBack={backToMaps}
      onViewChange={(next) => (view = next)}
      onAnalyze={analyze}
      analyzing={runtimeState.phase === "loading"}
    />

    {#if view === "review"}
      <main class="review">
        <aside class="listpane">
          {#if runtimeState.phase === "loading"}
            <div class="runtime-notice">
              <strong>Analyzing latest map…</strong>
              <span>The previous review stays visible until the new analysis finishes.</span>
            </div>
          {:else if runtimeState.phase === "error"}
            <div class="runtime-notice error" role="alert">
              <div>
                <strong>Analysis could not finish</strong>
                <span>{runtimeState.message} The previous review is still available.</span>
              </div>
              <button on:click={analyze}>Try again</button>
            </div>
          {:else if runtimeState.info?.configured}
            <div class="runtime-source">
              <span>Development artifact</span>
              <strong>{runtimeState.info.artifactLabel ?? "Configured map"}</strong>
            </div>
          {/if}
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
      <HistoryView mapName={activeMapName} events={mockHistory} />
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
  .runtime-notice,.runtime-source{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 18px;border-bottom:1px solid #2a3139;background:#131820;color:#929ca7}
  .runtime-notice>div,.runtime-notice{font-size:12px}.runtime-notice strong,.runtime-source strong{color:#d7dce1}.runtime-notice span,.runtime-source span{display:block;color:#8d969f;font-size:11px}
  .runtime-notice.error{border-bottom-color:#5a3035;background:#1a1113}.runtime-notice.error button{flex:0 0 auto;border:1px solid #5f3940;border-radius:6px;background:#21161a;color:#efb1b5;padding:5px 8px;cursor:pointer}
  .runtime-source{display:grid;gap:1px;background:#101419}
  @media(max-width:900px){.review{grid-template-columns:320px minmax(0,1fr)}}
  @media(max-width:759px){.review{height:calc(100vh - 94px);grid-template-columns:1fr}}
</style>
