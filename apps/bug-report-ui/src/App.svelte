<script lang="ts">
  import {
    BUG_REPORT_V2_LABELS,
    bugReportV2Progress,
    serializeBugReportV2,
    type BugReportParseIssue,
    type BugReportV2,
  } from "../../../engine/packages/bug-report/src/index.js";
  import {
    buildBugReportDownloadName,
    readBugReportFile,
  } from "./report-file.js";
  import {
    defaultBugReportView,
    filterBugReportBugs,
  } from "./report-view.js";
  import {
    GitHubReportClient,
    GitHubReportConflictError,
  } from "./github-report-client.js";
  import type {
    GitHubReportSummary,
    ReportSource,
  } from "./report-source.js";

  const github = new GitHubReportClient();

  let report: BugReportV2 | undefined;
  let source: ReportSource | undefined;
  let dirty = false;
  let importIssues: readonly BugReportParseIssue[] = [];
  let sourceFile = "";
  let query = "";
  let view: "all" | "not-fixed" | "fixed" = "all";
  let severity: "all" | "blocker" | "major" | "minor" = "all";
  let githubReports: readonly GitHubReportSummary[] = [];
  let githubBrowser = false;
  let githubLoading = false;
  let githubError = "";
  let saveState:
    | "saved"
    | "saving"
    | "failed"
    | "unsaved"
    | "conflict" = "saved";
  let searchInput: HTMLInputElement | undefined;

  $: progress = report
    ? bugReportV2Progress(report)
    : { fixed: 0, total: 0, allFixed: false };

  $: openSignal = report
    ? {
        open: report.bugs.filter((bug) => !bug.fixed).length,
        blocker: report.bugs.filter(
          (bug) => !bug.fixed && bug.severity === "blocker",
        ).length,
        major: report.bugs.filter(
          (bug) => !bug.fixed && bug.severity === "major",
        ).length,
        minor: report.bugs.filter(
          (bug) => !bug.fixed && bug.severity === "minor",
        ).length,
      }
    : { open: 0, blocker: 0, major: 0, minor: 0 };

  $: visibleBugs = report
    ? filterBugReportBugs(report.bugs, {
        view,
        severity,
        query,
      })
    : [];

  function resetFilters(next: BugReportV2) {
    query = "";
    severity = "all";
    view = defaultBugReportView(next);
  }

  function openDocument(
    next: BugReportV2,
    nextSource: ReportSource,
  ) {
    report = next;
    source = nextSource;
    dirty = false;
    saveState = "saved";
    importIssues = [];
    githubBrowser = false;
    githubError = "";
    resetFilters(next);
  }

  async function importReport(file: File) {
    const result = await readBugReportFile(file);
    sourceFile = file.name;
    if (!result.ok) {
      report = undefined;
      source = undefined;
      importIssues = result.issues;
      return;
    }
    openDocument(result.report, {
      kind: "file",
      fileName: file.name,
    });
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void importReport(file);
    input.value = "";
  }

  async function openGitHubBrowser() {
    githubLoading = true;
    githubError = "";
    try {
      githubReports = await github.listReports();
      githubBrowser = true;
    } catch (error) {
      githubReports = [];
      githubBrowser = true;
      githubError =
        error instanceof Error
          ? error.message
          : String(error);
    } finally {
      githubLoading = false;
    }
  }

  async function openGitHubReport(path: string) {
    githubLoading = true;
    githubError = "";
    try {
      const loaded = await github.loadReport(path);
      openDocument(loaded.report, {
        kind: "github",
        path,
        revision: loaded.revision,
      });
    } catch (error) {
      githubError =
        error instanceof Error
          ? error.message
          : String(error);
    } finally {
      githubLoading = false;
    }
  }

  function markDirty() {
    dirty = true;
    saveState = "unsaved";
  }

  function setFixed(id: string, fixed: boolean) {
    if (!report) return;
    report = {
      ...report,
      bugs: report.bugs.map((bug) =>
        bug.id === id
          ? { ...bug, fixed }
          : bug
      ),
    };
    markDirty();
  }

  function setRepairBy(value: "chatgpt" | "developer") {
    if (!report || report.repairBy === value) return;
    report = {
      ...report,
      repairBy: value,
    };
    markDirty();
  }

  function exportReport() {
    if (!report) return;
    const serialized = serializeBugReportV2(report);
    if (!serialized.ok || !serialized.json) {
      importIssues = serialized.issues.map((issue) => ({
        code: "semantic-error" as const,
        path: issue.path,
        message: issue.message,
      }));
      return;
    }

    const url = URL.createObjectURL(
      new Blob([serialized.json], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = buildBugReportDownloadName(report.map);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    if (source?.kind === "file") {
      dirty = false;
      saveState = "saved";
    }
  }

  async function saveToGitHub() {
    if (!report || source?.kind !== "file") return;
    saveState = "saving";
    const path =
      "bug-reports/" +
      buildBugReportDownloadName(report.map);

    try {
      const saved = await github.createReport(path, report);
      source = {
        kind: "github",
        path,
        revision: saved.revision,
      };
      dirty = false;
      saveState = "saved";
    } catch (error) {
      saveState =
        error instanceof GitHubReportConflictError
          ? "conflict"
          : "failed";
    }
  }

  async function saveGitHubReport() {
    if (!report || source?.kind !== "github") return;
    saveState = "saving";
    try {
      const saved = await github.saveReport(
        source.path,
        report,
        source.revision,
      );
      source = {
        ...source,
        revision: saved.revision,
      };
      dirty = false;
      saveState = "saved";
    } catch (error) {
      saveState =
        error instanceof GitHubReportConflictError
          ? "conflict"
          : "failed";
    }
  }

  async function reloadGitHubReport() {
    if (!source || source.kind !== "github") return;
    if (
      dirty &&
      !window.confirm(
        "Reload the GitHub version and discard local changes?",
      )
    ) {
      return;
    }
    await openGitHubReport(source.path);
  }

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    if (event.key === "/" && report && !typing) {
      event.preventDefault();
      searchInput?.focus();
      return;
    }

    if (event.key === "Escape" && query) {
      query = "";
      searchInput?.blur();
    }
  }

  function clearReport() {
    if (
      dirty &&
      !window.confirm(
        "This report has unsaved changes. Discard them?",
      )
    ) {
      return;
    }

    report = undefined;
    source = undefined;
    importIssues = [];
    sourceFile = "";
    query = "";
    view = "all";
    severity = "all";
    dirty = false;
    saveState = "saved";
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="shell">
  <header class="topbar">
    <div>
      <strong>M-Bedrock Bug Tracker</strong>
      <span>Audit → Report → Fix</span>
    </div>

    {#if report}
      <div class="actions">
        {#if source?.kind === "github"}
          <span class="save-state {saveState}">
            {saveState === "saved"
              ? "Saved"
              : saveState === "saving"
                ? "Saving…"
                : saveState === "failed"
                  ? "Save failed"
                  : saveState === "conflict"
                    ? "Changed on GitHub"
                    : "Unsaved changes"}
          </span>
          <button class="secondary" on:click={exportReport}>Export JSON</button>
          {#if saveState === "conflict"}
            <button class="secondary" on:click={reloadGitHubReport}>Reload GitHub</button>
          {/if}
          <button
            class="primary"
            disabled={!dirty || saveState === "saving" || saveState === "conflict"}
            on:click={saveGitHubReport}
          >
            Save
          </button>
        {:else}
          {#if saveState === "saving"}
            <span class="save-state">Saving…</span>
          {:else if saveState === "failed"}
            <span class="save-state failed">Save failed</span>
          {:else if saveState === "conflict"}
            <span class="save-state conflict">Already on GitHub</span>
          {/if}
          <button class="secondary" on:click={saveToGitHub} disabled={saveState === "saving"}>
            Save to GitHub
          </button>
          <button class="primary" on:click={exportReport}>Export JSON</button>
        {/if}
        <button class="secondary" on:click={clearReport}>Close</button>
      </div>
    {/if}
  </header>

  {#if !report}
    <main class="landing">
      <section class="entry-card">
        <div class="eyebrow">BUG REPORT</div>
        <h1>Open a bug report</h1>
        <p>Choose the report source. Both use the same Bug Report V2 workspace.</p>

        <div class="entry-actions">
          <button class="primary large" disabled={githubLoading} on:click={openGitHubBrowser}>
            {githubLoading ? "Loading…" : "Open from GitHub"}
          </button>

          <label class="file-button large">
            <input type="file" accept=".json,application/json" on:change={handleFileChange} />
            Import JSON
          </label>
        </div>
      </section>

      {#if githubBrowser}
        <section class="github-browser">
          <header>
            <div>
              <strong>GitHub Reports</strong>
              <span>bug-reports/</span>
            </div>
            <button class="secondary" on:click={() => (githubBrowser = false)}>Close</button>
          </header>

          {#if githubError}
            <div class="inline-error">{githubError}</div>
          {:else if githubReports.length === 0}
            <div class="empty">No GitHub bug reports found.</div>
          {:else}
            <div class="report-list">
              {#each githubReports as item}
                <button class="report-row" on:click={() => openGitHubReport(item.path)}>
                  <div>
                    <strong>{item.mapName}</strong>
                    <span>Map Version {item.mapVersion}</span>
                  </div>
                  <span class="report-signals">
                    {#if item.blockers > 0}
                      <b>{item.blockers} Blocker{item.blockers === 1 ? "" : "s"}</b>
                    {/if}
                    <span class="progress">{item.fixed} / {item.total} Fixed</span>
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      {#if importIssues.length > 0}
        <section class="errors" aria-live="polite">
          <strong>{sourceFile || "Report"} was rejected</strong>
          {#each importIssues as issue}
            <div class="error-row">
              <code>{issue.path}</code>
              <span>{issue.message}</span>
            </div>
          {/each}
        </section>
      {/if}
    </main>
  {:else}
    <section class="sourcebar">
      <span class="source-kind">{source?.kind === "github" ? "GitHub" : "File"}</span>
      <span>{source?.kind === "github" ? source.path : source?.fileName}</span>
    </section>

    <section class="mapbar">
      <div>
        <div class="eyebrow">MAP</div>
        <h1>{report.map.name}</h1>
        <div class="meta">
          <span>{BUG_REPORT_V2_LABELS.mapVersion} {report.map.mapVersion}</span>
          <span>{BUG_REPORT_V2_LABELS.baseVersion} {report.map.baseVersion}</span>
          <span>{BUG_REPORT_V2_LABELS.testedVersion} {report.map.testedVersion}</span>
        </div>
        {#if report.map.baseVersion !== report.map.testedVersion}
          <div class="version-note">Base Version differs from Tested Version</div>
        {/if}
      </div>

      <div class="summary">
        <strong>{openSignal.open} Open</strong>
        <span>
          {openSignal.blocker} Blocker ·
          {openSignal.major} Major ·
          {openSignal.minor} Minor
        </span>
        <small>{progress.fixed} / {progress.total} Fixed</small>
      </div>
    </section>

    <section class="controlbar">
      <div class="repair-owner">
        <span>{BUG_REPORT_V2_LABELS.repairBy}</span>
        <button class:active={report.repairBy === "developer"} on:click={() => setRepairBy("developer")}>Developer</button>
        <button class:active={report.repairBy === "chatgpt"} on:click={() => setRepairBy("chatgpt")}>ChatGPT</button>
      </div>

      <div class="views">
        <button class:active={view === "all"} on:click={() => (view = "all")}>All</button>
        <button class:active={view === "not-fixed"} on:click={() => (view = "not-fixed")}>Not Fixed</button>
        <button class:active={view === "fixed"} on:click={() => (view = "fixed")}>Fixed</button>
      </div>

      <label class="severity-filter">
        <span>{BUG_REPORT_V2_LABELS.severity}</span>
        <select bind:value={severity}>
          <option value="all">All</option>
          <option value="blocker">Blocker</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
      </label>

      <input
        bind:this={searchInput}
        bind:value={query}
        placeholder="Search bugs…  /"
        aria-label="Search bugs"
      />
    </section>

    <main class="workspace">
      {#if visibleBugs.length === 0}
        <div class="empty">No bugs match this view.</div>
      {/if}

      {#each visibleBugs as bug}
        <details class:fixed={bug.fixed} class="bug">
          <summary>
            <label class="check">
              <input
                type="checkbox"
                checked={bug.fixed}
                on:click|stopPropagation
                on:change={(event) =>
                  setFixed(
                    bug.id,
                    (event.currentTarget as HTMLInputElement).checked,
                  )}
              />
            </label>

            <div class="bug-title">
              <strong>{bug.id} · {bug.title}</strong>
              <span class="bug-problem">{bug.problem}</span>
              {#if bug.suggestedFix}
                <span class="bug-action">
                  <b>Action</b>
                  {bug.suggestedFix}
                </span>
              {/if}
            </div>

            <span class="severity {bug.severity}">{bug.severity}</span>
          </summary>

          <div class="bug-body">
            <div class="bug-meta">{bug.category} · Found By {bug.foundBy}</div>
            <div class="comparison">
              <section><h3>{BUG_REPORT_V2_LABELS.expected}</h3><p>{bug.expected}</p></section>
              <section><h3>{BUG_REPORT_V2_LABELS.observed}</h3><p>{bug.observed}</p></section>
            </div>
            {#if bug.reproduction}
              <section><h3>{BUG_REPORT_V2_LABELS.reproduction}</h3><ol>{#each bug.reproduction as item}<li>{item}</li>{/each}</ol></section>
            {/if}
            {#if bug.aiAnalysis}
              <section><h3>Technical Analysis</h3><p>{bug.aiAnalysis}</p></section>
            {/if}
            {#if bug.relevantCode}
              <section>
                <h3>{BUG_REPORT_V2_LABELS.relevantCode}</h3>
                {#each bug.relevantCode as item}
                  <div class="code-row"><code>{item.file}</code><span>{item.reason}</span></div>
                {/each}
              </section>
            {/if}
            {#if bug.mustPreserve}
              <section><h3>{BUG_REPORT_V2_LABELS.mustPreserve}</h3><ul>{#each bug.mustPreserve as item}<li>{item}</li>{/each}</ul></section>
            {/if}
          </div>
        </details>
      {/each}
    </main>
  {/if}
</div>

<style>
  :global(*){box-sizing:border-box}
  :global(body){margin:0;background:#0b0d0f;color:#eef1f4;font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  :global(button),:global(input),:global(select){font:inherit}
  .shell{min-height:100vh}
  .topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid #20252a;background:#101317}
  .topbar>div:first-child{display:grid}.topbar span,.meta{font-size:11px;color:#7f8994}.actions,.repair-owner,.views,.meta,.entry-actions{display:flex;gap:8px;align-items:center}
  button,.file-button{border:1px solid #303740;border-radius:7px;background:#15191e;color:#c3cad2;padding:8px 11px;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.45}.primary,.file-button,.active{background:#7d85ff;color:#090b0e;border-color:#8d94ff}.large{padding:10px 15px}
  .landing{max-width:780px;margin:auto;padding:76px 24px}.entry-card,.github-browser{padding:30px;border:1px solid #242a31;border-radius:14px;background:#101419}.eyebrow{font-size:10px;font-weight:750;letter-spacing:.13em;color:#818b96}.entry-card h1,.mapbar h1{margin:6px 0}.entry-card p{margin:0 0 22px;color:#98a1aa}.file-button input{display:none}
  .github-browser{margin-top:16px;padding:18px}.github-browser>header{display:flex;align-items:center;justify-content:space-between}.github-browser>header div{display:grid}.github-browser>header span{font-size:11px;color:#7f8994}.report-list{margin-top:12px;border-top:1px solid #242a31}.report-row{width:100%;display:flex;align-items:center;justify-content:space-between;border:0;border-bottom:1px solid #20262c;border-radius:0;background:transparent;padding:13px 4px;text-align:left}.report-row:hover{background:#14191e}.report-row div{display:grid}.report-row div span,.progress{font-size:11px;color:#7f8994}.report-signals{display:flex;align-items:center;gap:12px}.report-signals b{font-size:10px;text-transform:uppercase;color:#ff9da6}
  .inline-error{margin-top:14px;color:#efb1b5}.errors{margin-top:16px;border:1px solid #553037;border-radius:10px;padding:16px}.error-row{display:grid;grid-template-columns:220px 1fr;gap:12px;padding-top:8px}
  .sourcebar{display:flex;gap:9px;align-items:center;padding:8px 30px;border-bottom:1px solid #20252a;background:#0d1013;color:#7f8994;font-size:11px}.source-kind{color:#eef1f4;font-weight:700}
  .mapbar{display:flex;align-items:flex-end;justify-content:space-between;padding:24px 30px;border-bottom:1px solid #20252a;background:#101317}.version-note{margin-top:8px;font-size:11px;color:#eec477}.summary{display:grid;gap:2px;text-align:right}.summary strong{font-size:22px}.summary span{font-size:10px;text-transform:uppercase;color:#aab2bb}.summary small{font-size:10px;color:#68727c}.meta{gap:14px}
  .save-state{font-size:11px}.save-state.failed,.save-state.conflict{color:#efb1b5}.save-state.unsaved{color:#eec477}
  .controlbar{display:flex;align-items:center;gap:16px;padding:12px 30px;border-bottom:1px solid #20252a;background:#0f1215}.repair-owner>span{font-size:11px;color:#7f8994}.severity-filter{display:flex;align-items:center;gap:7px;font-size:11px;color:#7f8994}.severity-filter select{border:1px solid #2a3138;border-radius:7px;background:#0b0e11;color:#e9edf1;padding:7px 9px}.controlbar>input{margin-left:auto;min-width:240px;border:1px solid #2a3138;border-radius:7px;background:#0b0e11;color:#e9edf1;padding:8px 10px}
  .workspace{max-width:1100px;padding:18px 30px 80px}.bug{border-bottom:1px solid #20262c}.bug.fixed{opacity:.55}.bug summary{list-style:none;display:grid;grid-template-columns:34px 1fr auto;align-items:start;gap:12px;padding:16px 4px;cursor:pointer}.bug summary::-webkit-details-marker{display:none}.check input{width:17px;height:17px}.bug-title{display:grid;gap:4px}.bug-title strong{line-height:1.35}.bug-problem{font-size:12px;color:#aeb6bf;line-height:1.45}.bug-action{font-size:11px;color:#c9d0d7;line-height:1.45}.bug-action b{margin-right:6px;color:#8f98ff;text-transform:uppercase;font-size:9px;letter-spacing:.08em}
  .severity{border-radius:999px;padding:3px 7px;font-size:10px;font-weight:750;text-transform:uppercase}.severity.blocker{background:#3b171c;color:#ff9da6}.severity.major{background:#382b16;color:#eec477}.severity.minor{background:#1d2931;color:#9dc5dc}
  .bug-body{display:grid;gap:18px;padding:2px 46px 26px;color:#b8c0c8}.bug-meta{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#69737d}.bug-body section{display:grid;gap:5px}.bug-body h3{margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#79848e}.bug-body p,.bug-body ol,.bug-body ul{margin:0}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:24px}.code-row{display:grid;grid-template-columns:minmax(180px,.7fr) 1fr;gap:14px;padding:5px 0}.code-row code{color:#aeb5ff}.empty{padding:28px 0;color:#737d87}
  @media(max-width:760px){.topbar{padding:0 15px}.actions{gap:5px}.entry-actions{align-items:stretch;flex-direction:column}.mapbar{align-items:flex-start;flex-direction:column;padding:18px 16px}.sourcebar{padding:8px 16px}.summary{text-align:left}.controlbar{align-items:stretch;flex-direction:column;padding:12px 16px}.controlbar>input{margin:0;min-width:0}.workspace{padding:12px 16px 60px}.comparison{grid-template-columns:1fr}.bug-body{padding-left:4px}.code-row{grid-template-columns:1fr}}
</style>
