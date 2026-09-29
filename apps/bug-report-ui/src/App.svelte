<script lang="ts">
  import {
    bugReportV2Progress,
    serializeBugReportV2,
    type BugReportParseIssue,
    type BugReportV2,
  } from "../../../packages/bug-report/src/index.js";
  import {
    buildBugReportDownloadName,
    readBugReportFile,
  } from "./report-file.js";

  let report: BugReportV2 | undefined;
  let importIssues: readonly BugReportParseIssue[] = [];
  let sourceFile = "";
  let query = "";
  let view: "all" | "not-fixed" | "fixed" = "all";

  $: progress = report
    ? bugReportV2Progress(report)
    : { fixed: 0, total: 0, allFixed: false };

  $: visibleBugs = report
    ? report.bugs.filter((bug) => {
        const fixedMatch =
          view === "all" ||
          (view === "fixed" && bug.fixed) ||
          (view === "not-fixed" && !bug.fixed);
        const haystack = [
          bug.id,
          bug.title,
          bug.problem,
          bug.expected,
          bug.observed,
          bug.aiAnalysis ?? "",
          bug.category,
          bug.severity,
        ].join(" ").toLowerCase();
        return (
          fixedMatch &&
          haystack.includes(query.trim().toLowerCase())
        );
      })
    : [];

  async function importReport(file: File) {
    const result = await readBugReportFile(file);
    sourceFile = file.name;
    if (!result.ok) {
      report = undefined;
      importIssues = result.issues;
      return;
    }
    report = result.report;
    importIssues = [];
    query = "";
    view = "all";
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void importReport(file);
    input.value = "";
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
  }

  function setRepairBy(value: "chatgpt" | "developer") {
    if (!report) return;
    report = {
      ...report,
      repairBy: value,
    };
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
  }

  function clearReport() {
    report = undefined;
    importIssues = [];
    sourceFile = "";
    query = "";
    view = "all";
  }
</script>

<div class="shell">
  <header class="topbar">
    <div>
      <strong>M-Bedrock Bug Tracker</strong>
      <span>Audit → Report → Fix</span>
    </div>
    {#if report}
      <div class="actions">
        <button class="secondary" on:click={clearReport}>Close</button>
        <button class="primary" on:click={exportReport}>Export JSON</button>
      </div>
    {/if}
  </header>

  {#if !report}
    <main class="landing">
      <section class="import-card">
        <div class="eyebrow">BUG REPORT</div>
        <h1>Open a bug report</h1>
        <p>
          Import one report for one map. Legacy V1 reports are upgraded automatically for this tracker.
        </p>
        <label class="file-button">
          <input type="file" accept=".json,application/json" on:change={handleFileChange} />
          Import report JSON
        </label>
      </section>

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
    <section class="mapbar">
      <div>
        <div class="eyebrow">MAP</div>
        <h1>{report.map.name}</h1>
        <div class="meta">
          <span>Map Version {report.map.mapVersion}</span>
          <span>Base Version {report.map.baseVersion}</span>
          <span>Tested Version {report.map.testedVersion}</span>
        </div>
      </div>

      <div class="summary">
        <strong>{progress.fixed} / {progress.total}</strong>
        <span>{progress.allFixed ? "All Fixed" : "Fixed"}</span>
      </div>
    </section>

    <section class="controlbar">
      <div class="repair-owner">
        <span>Repair By</span>
        <button
          class:active={report.repairBy === "developer"}
          on:click={() => setRepairBy("developer")}
        >Developer</button>
        <button
          class:active={report.repairBy === "chatgpt"}
          on:click={() => setRepairBy("chatgpt")}
        >ChatGPT</button>
      </div>

      <div class="views">
        <button class:active={view === "all"} on:click={() => (view = "all")}>All</button>
        <button class:active={view === "not-fixed"} on:click={() => (view = "not-fixed")}>Not Fixed</button>
        <button class:active={view === "fixed"} on:click={() => (view = "fixed")}>Fixed</button>
      </div>

      <input bind:value={query} placeholder="Search bugs…" aria-label="Search bugs" />
    </section>

    <main class="workspace">
      {#if visibleBugs.length === 0}
        <div class="empty">No bugs match this view.</div>
      {/if}

      {#each visibleBugs as bug}
        <details class:fixed={bug.fixed} class="bug">
          <summary>
            <label class="check" on:click|stopPropagation>
              <input
                type="checkbox"
                checked={bug.fixed}
                on:change={(event) =>
                  setFixed(
                    bug.id,
                    (event.currentTarget as HTMLInputElement).checked,
                  )}
              />
            </label>

            <div class="bug-title">
              <strong>{bug.id} · {bug.title}</strong>
              <span>{bug.category} · Found By {bug.foundBy}</span>
            </div>

            <span class="severity {bug.severity}">{bug.severity}</span>
          </summary>

          <div class="bug-body">
            <section>
              <h3>Problem</h3>
              <p>{bug.problem}</p>
            </section>

            <div class="comparison">
              <section>
                <h3>Expected</h3>
                <p>{bug.expected}</p>
              </section>
              <section>
                <h3>Observed</h3>
                <p>{bug.observed}</p>
              </section>
            </div>

            {#if bug.reproduction}
              <section>
                <h3>Reproduction</h3>
                <ol>{#each bug.reproduction as item}<li>{item}</li>{/each}</ol>
              </section>
            {/if}

            {#if bug.aiAnalysis}
              <section>
                <h3>AI Analysis</h3>
                <p>{bug.aiAnalysis}</p>
              </section>
            {/if}

            {#if bug.relevantCode}
              <section>
                <h3>Relevant Code</h3>
                {#each bug.relevantCode as item}
                  <div class="code-row">
                    <code>{item.file}</code>
                    <span>{item.reason}</span>
                  </div>
                {/each}
              </section>
            {/if}

            {#if bug.suggestedFix}
              <section>
                <h3>Suggested Fix</h3>
                <p>{bug.suggestedFix}</p>
              </section>
            {/if}

            {#if bug.mustPreserve}
              <section>
                <h3>Must Preserve</h3>
                <ul>{#each bug.mustPreserve as item}<li>{item}</li>{/each}</ul>
              </section>
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
  :global(button),:global(input){font:inherit}
  .shell{min-height:100vh}.topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid #20252a;background:#101317}
  .topbar>div:first-child{display:grid}.topbar span,.meta,.bug-title span{font-size:11px;color:#7f8994}.actions,.repair-owner,.views,.meta{display:flex;gap:8px}
  button,.file-button{border:1px solid #303740;border-radius:7px;background:#15191e;color:#c3cad2;padding:8px 11px;cursor:pointer}.primary,.file-button,.active{background:#7d85ff;color:#090b0e;border-color:#8d94ff}
  .landing{max-width:720px;margin:auto;padding:90px 24px}.import-card{padding:34px;border:1px solid #242a31;border-radius:14px;background:#101419}.eyebrow{font-size:10px;font-weight:750;letter-spacing:.13em;color:#818b96}.import-card h1,.mapbar h1{margin:6px 0}.import-card p{color:#98a1aa}.file-button input{display:none}
  .errors{margin-top:16px;border:1px solid #553037;border-radius:10px;padding:16px}.error-row{display:grid;grid-template-columns:220px 1fr;gap:12px;padding-top:8px}
  .mapbar{display:flex;align-items:flex-end;justify-content:space-between;padding:24px 30px;border-bottom:1px solid #20252a;background:#101317}.summary{display:grid;text-align:right}.summary strong{font-size:22px}.summary span{font-size:10px;text-transform:uppercase;color:#7d8791}.meta{gap:14px}
  .controlbar{display:flex;align-items:center;gap:16px;padding:12px 30px;border-bottom:1px solid #20252a;background:#0f1215}.repair-owner{align-items:center}.repair-owner>span{font-size:11px;color:#7f8994}.controlbar input{margin-left:auto;min-width:240px;border:1px solid #2a3138;border-radius:7px;background:#0b0e11;color:#e9edf1;padding:8px 10px}
  .workspace{max-width:1100px;padding:18px 30px 80px}.bug{border-bottom:1px solid #20262c}.bug.fixed{opacity:.55}.bug summary{list-style:none;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:12px;padding:16px 4px;cursor:pointer}.bug summary::-webkit-details-marker{display:none}.check input{width:17px;height:17px}.bug-title{display:grid;gap:2px}
  .severity{border-radius:999px;padding:3px 7px;font-size:10px;font-weight:750;text-transform:uppercase}.severity.blocker{background:#3b171c;color:#ff9da6}.severity.major{background:#382b16;color:#eec477}.severity.minor{background:#1d2931;color:#9dc5dc}
  .bug-body{display:grid;gap:18px;padding:2px 46px 26px;color:#b8c0c8}.bug-body section{display:grid;gap:5px}.bug-body h3{margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#79848e}.bug-body p,.bug-body ol,.bug-body ul{margin:0}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:24px}.code-row{display:grid;grid-template-columns:minmax(180px,.7fr) 1fr;gap:14px;padding:5px 0}.code-row code{color:#aeb5ff}.empty{padding:36px 0;color:#737d87}
  @media(max-width:760px){.topbar{padding:0 15px}.mapbar{align-items:flex-start;flex-direction:column;padding:18px 16px}.summary{text-align:left}.controlbar{align-items:stretch;flex-direction:column;padding:12px 16px}.controlbar input{margin:0;min-width:0}.workspace{padding:12px 16px 60px}.comparison{grid-template-columns:1fr}.bug-body{padding-left:4px}.code-row{grid-template-columns:1fr}}
</style>
