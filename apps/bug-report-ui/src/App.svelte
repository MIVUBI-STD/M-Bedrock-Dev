<script lang="ts">
  import {
    highestBugSeverity,
    parseBugReportJson,
    serializeBugReportV1,
    type BugReportParseIssue,
    type BugReportV1,
  } from "../../../packages/bug-report/src/index.js";
  import {
    buildBugReportDownloadName,
    readBugReportFile,
  } from "./report-file.js";

  let report: BugReportV1 | undefined;
  let importIssues: readonly BugReportParseIssue[] = [];
  let sourceFile = "";
  let query = "";
  let activeCategory = "all";

  $: visibleFinders = report
    ? report.bugFinders
        .filter((finder) =>
          activeCategory === "all" || finder.category === activeCategory
        )
        .map((finder) => ({
          ...finder,
          bugs: finder.bugs.filter((bug) => {
            const haystack = [
              bug.title,
              bug.problem,
              bug.expected,
              bug.observed.gameplay ?? "",
              bug.observed.code ?? "",
            ].join(" ").toLowerCase();
            return haystack.includes(query.trim().toLowerCase());
          }),
        }))
        .filter((finder) => finder.bugs.length > 0)
    : [];

  $: totalBugs = report
    ? report.bugFinders.reduce((total, finder) => total + finder.bugs.length, 0)
    : 0;

  $: blockerCount = report
    ? report.bugFinders.reduce(
        (total, finder) =>
          total + finder.bugs.filter((bug) => bug.severity === "blocker").length,
        0,
      )
    : 0;

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
    activeCategory = "all";
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void importReport(file);
    input.value = "";
  }

  function exportReport() {
    if (!report) return;

    const serialized = serializeBugReportV1(report);
    if (!serialized.ok) {
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
    activeCategory = "all";
  }
</script>

<div class="shell">
  <header class="topbar">
    <div>
      <strong>M-Bedrock Bug Report</strong>
      <span>One map · one test session</span>
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
        <div class="eyebrow">BUG REPORT V1</div>
        <h1>Open a test report</h1>
        <p>
          Import one JSON report for one tested map. The file is validated before anything is shown.
        </p>
        <label class="file-button">
          <input type="file" accept=".json,application/json" on:change={handleFileChange} />
          Import report JSON
        </label>
        <small>No map analysis runs in this web interface.</small>
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
      <div class="map-identity">
        <div class="eyebrow">TESTED MAP</div>
        <h1>{report.map.name}</h1>
        <div class="map-meta">
          <span>v{report.map.version}</span>
          <span>Minecraft {report.map.minecraftVersion}</span>
          <a href={report.map.drive} target="_blank" rel="noreferrer">Open Drive map ↗</a>
        </div>
      </div>
      <div class="summary">
        <div><strong>{totalBugs}</strong><span>bugs</span></div>
        <div><strong>{blockerCount}</strong><span>blockers</span></div>
        <div><strong>{report.bugFinders.length}</strong><span>finders</span></div>
      </div>
    </section>

    <main class="workspace">
      <aside class="filters">
        <input bind:value={query} placeholder="Search bugs…" aria-label="Search bugs" />
        <button class:active={activeCategory === "all"} on:click={() => (activeCategory = "all")}>
          All
        </button>
        {#each report.bugFinders as finder}
          <button
            class:active={activeCategory === finder.category}
            on:click={() => (activeCategory = finder.category)}
          >
            <span>{finder.category}</span>
            <small>{finder.bugs.length}</small>
          </button>
        {/each}
      </aside>

      <section class="finders">
        {#if visibleFinders.length === 0}
          <div class="empty">No bugs match this filter.</div>
        {/if}

        {#each visibleFinders as finder}
          <section class="finder">
            <header>
              <div>
                <h2>{finder.category}</h2>
                <span>{finder.bugs.length} bug{finder.bugs.length === 1 ? "" : "s"}</span>
              </div>
              <span class="severity {highestBugSeverity(finder.bugs)}">
                {highestBugSeverity(finder.bugs)}
              </span>
            </header>

            <div class="bug-list">
              {#each finder.bugs as bug}
                <details class="bug">
                  <summary>
                    <div>
                      <strong>{bug.title}</strong>
                      <span>{bug.foundBy} · {bug.verification}</span>
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
                        {#if bug.observed.gameplay}<p><b>Gameplay:</b> {bug.observed.gameplay}</p>{/if}
                        {#if bug.observed.code}<p><b>Code:</b> {bug.observed.code}</p>{/if}
                      </section>
                    </div>

                    {#if bug.preconditions}
                      <section>
                        <h3>Preconditions</h3>
                        <ol>{#each bug.preconditions as item}<li>{item}</li>{/each}</ol>
                      </section>
                    {/if}

                    {#if bug.reproduction}
                      <section>
                        <h3>Reproduction</h3>
                        <ol>{#each bug.reproduction as item}<li>{item}</li>{/each}</ol>
                        {#if bug.reproducibility}
                          <small>Reproduced {bug.reproducibility.reproduced}/{bug.reproducibility.attempts} attempts</small>
                        {/if}
                      </section>
                    {/if}

                    {#if bug.verifyBug}
                      <section>
                        <h3>Verify candidate</h3>
                        <ol>{#each bug.verifyBug as item}<li>{item}</li>{/each}</ol>
                      </section>
                    {/if}

                    {#if bug.diagnosis}
                      <section>
                        <h3>Diagnosis</h3>
                        <p>{bug.diagnosis}</p>
                      </section>
                    {/if}

                    {#if bug.rootCause}
                      <section>
                        <h3>Root cause</h3>
                        <p>{bug.rootCause}</p>
                      </section>
                    {/if}

                    {#if bug.relevantCode}
                      <section>
                        <h3>Relevant code</h3>
                        {#each bug.relevantCode as item}
                          <div class="code-row">
                            <code>{item.file}{item.lines ? ":" + item.lines : ""}</code>
                            <span>{item.reason}</span>
                          </div>
                        {/each}
                      </section>
                    {/if}

                    {#if bug.repairDirection}
                      <section>
                        <h3>Repair direction</h3>
                        <p>{bug.repairDirection}</p>
                      </section>
                    {/if}

                    {#if bug.mustPreserve}
                      <section>
                        <h3>Must preserve</h3>
                        <ul>{#each bug.mustPreserve as item}<li>{item}</li>{/each}</ul>
                      </section>
                    {/if}

                    {#if bug.fixValidation}
                      <section>
                        <h3>Fix validation</h3>
                        <ol>{#each bug.fixValidation as item}<li>{item}</li>{/each}</ol>
                      </section>
                    {/if}

                    {#if bug.evidence}
                      <section>
                        <h3>Evidence</h3>
                        {#each bug.evidence as item}
                          <a class="evidence" href={item.drive} target="_blank" rel="noreferrer">
                            {item.description} ↗
                          </a>
                        {/each}
                      </section>
                    {/if}
                  </div>
                </details>
              {/each}
            </div>
          </section>
        {/each}
      </section>
    </main>
  {/if}
</div>

<style>
  :global(*){box-sizing:border-box}
  :global(body){margin:0;background:#0b0d0f;color:#eef1f4;font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  :global(button),:global(input){font:inherit}
  :global(a){color:inherit}
  .shell{min-height:100vh}
  .topbar{height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid #20252a;background:#101317}
  .topbar>div:first-child{display:grid;gap:1px}.topbar strong{font-size:14px}.topbar span{font-size:11px;color:#7f8994}
  .actions{display:flex;gap:8px}.primary,.secondary,.file-button{border-radius:7px;padding:8px 12px;font-weight:650;cursor:pointer}
  .primary{border:1px solid #8d94ff;background:#7d85ff;color:#080a0d}.secondary{border:1px solid #303740;background:#15191e;color:#c3cad2}
  .landing{max-width:760px;margin:0 auto;padding:90px 24px}.import-card{padding:34px;border:1px solid #242a31;border-radius:14px;background:#101419}
  .eyebrow{font-size:10px;font-weight:750;letter-spacing:.13em;color:#818b96}.import-card h1,.map-identity h1{margin:7px 0 6px;font-size:28px;line-height:1.2}.import-card p{max-width:560px;margin:0 0 24px;color:#98a1aa}
  .file-button{display:inline-block;background:#7d85ff;color:#080a0d}.file-button input{display:none}.import-card small{display:block;margin-top:12px;color:#727c86}
  .errors{margin-top:16px;border:1px solid #553037;border-radius:10px;background:#171113;padding:16px}.errors>strong{color:#efb1b5}.error-row{display:grid;grid-template-columns:minmax(150px,240px) 1fr;gap:12px;padding:10px 0;border-top:1px solid #352126}.error-row:first-of-type{margin-top:10px}.error-row code{color:#d6a2a6}.error-row span{color:#b9a4a7}
  .mapbar{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;padding:26px 30px;border-bottom:1px solid #20252a;background:#101317}.map-meta{display:flex;flex-wrap:wrap;gap:8px 14px;color:#858f99}.map-meta a{text-decoration:none;color:#aeb5ff}
  .summary{display:flex;gap:26px}.summary div{display:grid;text-align:right}.summary strong{font-size:20px}.summary span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#7d8791}
  .workspace{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:calc(100vh - 157px)}.filters{padding:20px 14px;border-right:1px solid #20252a;background:#0f1215;display:flex;flex-direction:column;gap:5px}.filters input{margin-bottom:10px;width:100%;border:1px solid #2a3138;border-radius:7px;background:#0b0e11;color:#e9edf1;padding:9px 10px;outline:none}.filters button{display:flex;justify-content:space-between;gap:8px;border:0;border-radius:7px;background:transparent;color:#8f99a4;padding:8px 9px;text-align:left;cursor:pointer}.filters button.active{background:#1a1f26;color:#f0f2f5}.filters small{color:#66717c}
  .finders{min-width:0;max-width:1100px;width:100%;padding:26px 30px 80px}.finder{margin-bottom:32px}.finder>header{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #242a30}.finder h2{margin:0;text-transform:uppercase;font-size:12px;letter-spacing:.08em}.finder header div span{font-size:11px;color:#77818c}
  .severity{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.06em}.severity.blocker{background:#3b171c;color:#ff9da6}.severity.major{background:#382b16;color:#eec477}.severity.minor{background:#1d2931;color:#9dc5dc}
  .bug-list{display:grid}.bug{border-bottom:1px solid #20262c}.bug summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 4px;cursor:pointer}.bug summary::-webkit-details-marker{display:none}.bug summary>div{display:grid;gap:2px}.bug summary strong{font-size:14px}.bug summary div span{font-size:11px;color:#76818c}
  .bug-body{display:grid;gap:18px;padding:4px 4px 24px;max-width:900px;color:#b8c0c8}.bug-body section{display:grid;gap:6px}.bug-body h3{margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#79848e}.bug-body p{margin:0}.bug-body ol,.bug-body ul{margin:0;padding-left:20px}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:24px}.code-row{display:grid;grid-template-columns:minmax(180px,.7fr) 1fr;gap:14px;padding:7px 0}.code-row code{color:#aeb5ff}.evidence{display:block;text-decoration:none;color:#aeb5ff;padding:5px 0}.empty{padding:36px 0;color:#737d87}
  @media(max-width:760px){.topbar{padding:0 15px}.mapbar{align-items:flex-start;flex-direction:column;padding:20px 16px}.summary{width:100%;justify-content:space-between}.summary div{text-align:left}.workspace{grid-template-columns:1fr}.filters{border-right:0;border-bottom:1px solid #20252a;flex-direction:row;overflow:auto;padding:12px}.filters input{min-width:180px;margin:0}.filters button{white-space:nowrap}.finders{padding:20px 16px 60px}.comparison{grid-template-columns:1fr}.code-row{grid-template-columns:1fr}}
</style>
