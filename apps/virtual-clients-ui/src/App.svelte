<script lang="ts">
  import { onMount } from "svelte";
  import { backend, BackendBridgeError } from "./bridge.js";
  import type {
    ClientLifecycleActions,
    ClientStatus,
    EnginePolicy,
    EngineSnapshot,
    OperationRecord,
    UpdateCheck,
  } from "./contracts.js";
  import {
    actionForClient,
    actionLabel,
    blockerLabel,
    issueLabel,
    setupHint,
    stateLabel,
    updateLabel,
  } from "./view-model.js";

  type Page = "setup" | "clients" | "health" | "history";

  let snapshot: EngineSnapshot | undefined;
  let policy: EnginePolicy | undefined;
  let actions: readonly ClientLifecycleActions[] = [];
  let history: readonly OperationRecord[] = [];
  let update: UpdateCheck | undefined;
  let confirmReprovision: string | undefined;
  let loading = true;
  let busy = "";
  let error = "";
  let supportPath = "";
  let page: Page = "setup";
  let pageChosen = false;

  $: clients = snapshot?.diagnostics.runtime.clients ?? [];
  $: native = clients.find((client) => client.native);
  $: virtuals = clients.filter((client) => !client.native);
  $: issues = snapshot?.doctor.issues ?? [];
  $: blockers = issues.filter((issue) => issue.severity === "BLOCKER");
  $: warnings = issues.filter((issue) => issue.severity === "WARNING");
  $: runningVirtuals = virtuals.filter((client) => client.state === "RUNNING").length;
  $: readyVirtuals = virtuals.filter((client) => client.readySnapshot === true).length;

  function selectPage(next: Page) {
    pageChosen = true;
    page = next;
  }

  function errorMessage(value: unknown): string {
    if (value instanceof BackendBridgeError) return value.message;
    if (value instanceof Error) return value.message;
    return String(value);
  }

  async function refresh() {
    loading = true;
    error = "";
    try {
      const [nextSnapshot, nextPolicy, nextActions, nextHistory, nextUpdate] = await Promise.all([
        backend.snapshot(),
        backend.policy(),
        backend.actions(),
        backend.history(),
        backend.checkUpdate(),
      ]);
      snapshot = nextSnapshot;
      policy = nextPolicy;
      actions = nextActions;
      history = nextHistory;
      update = nextUpdate;

      if (!pageChosen) {
        page = nextSnapshot.doctor.nextSetupAction === "READY" ? "clients" : "setup";
      }
    } catch (value) {
      error = errorMessage(value);
      snapshot = undefined;
      actions = [];
      update = undefined;
    } finally {
      loading = false;
    }
  }

  async function mutate(label: string, operation: () => Promise<unknown>) {
    busy = label;
    error = "";
    try {
      await operation();
      await refresh();
    } catch (value) {
      error = errorMessage(value);
    } finally {
      busy = "";
    }
  }

  async function createSupportBundle() {
    busy = "support";
    error = "";
    try {
      const result = await backend.supportBundle();
      supportPath = result.path;
      history = await backend.history();
    } catch (value) {
      error = errorMessage(value);
    } finally {
      busy = "";
    }
  }

  function primarySetupAction() {
    const action = snapshot?.doctor.nextSetupAction;
    if (!action || action === "READY") return undefined;

    switch (action) {
      case "REGISTER_BASE":
        return () => mutate("setup", backend.registerBase);
      case "PROVISION_VIRTUALS":
        return () => mutate("setup", backend.provision);
      case "VERIFY_IDENTITIES":
        return () => mutate("setup", backend.verifyIdentities);
      default:
        return undefined;
    }
  }

  function clientActions(client: ClientStatus) {
    return actionForClient(actions, client.id);
  }

  async function stageUpdate() {
    await mutate("stage-update", backend.stageUpdate);
  }

  async function reprovisionConfirmed() {
    const client = confirmReprovision as ClientStatus["id"] | undefined;
    if (!client || client === "Native") return;
    confirmReprovision = undefined;
    await mutate(`reprovision-${client}`, () => backend.reprovision(client));
  }

  onMount(() => {
    void refresh();
  });
</script>

<div class="app-shell">
  <aside class="rail">
    <div class="brand">
      <div class="brand-mark">MB</div>
      <div>
        <strong>Virtual Clients</strong>
        <span>M-Bedrock</span>
      </div>
    </div>

    <nav aria-label="Virtual Clients navigation">
      <button class:active={page === "setup"} class="nav-item" on:click={() => selectPage("setup")}>
        <span>Setup</span>
        <small>{snapshot?.doctor.nextSetupAction === "READY" ? "Complete" : "Action needed"}</small>
      </button>
      <button class:active={page === "clients"} class="nav-item" on:click={() => selectPage("clients")}>
        <span>Clients</span>
        <small>{runningVirtuals} running · {readyVirtuals} ready</small>
      </button>
      <button class:active={page === "health"} class="nav-item" on:click={() => selectPage("health")}>
        <span>Health</span>
        <small>{blockers.length} blockers · {warnings.length} warnings</small>
      </button>
      <button class:active={page === "history"} class="nav-item" on:click={() => selectPage("history")}>
        <span>History</span>
        <small>{history.length} recent operations</small>
      </button>
    </nav>

    <div class="rail-bottom">
      {#if policy}
        <div class="policy-note">
          <span>ENGINE POLICY</span>
          <strong>{policy.maxVirtualClients} Virtuals · {policy.virtualMemoryLimitMb / 1024} GB ceiling</strong>
          <small>{policy.virtualVcpus} vCPU each · Native is version authority</small>
        </div>
      {/if}
      <button class="quiet" disabled={loading || Boolean(busy)} on:click={refresh}>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  </aside>

  <main>
    <header class="topbar">
      <div>
        <span class="eyebrow">M-BEDROCK / VIRTUAL CLIENTS</span>
        <h1>{page === "setup" ? "Setup" : page === "clients" ? "Clients" : page === "health" ? "Health" : "History"}</h1>
      </div>

      <div class="top-actions">
        <div class="provider-state">
          <span class:online={Boolean(snapshot?.doctor.provider)}></span>
          {snapshot?.doctor.provider ?? "Provider unavailable"}
        </div>
        {#if snapshot}
          <div class="ready-state" class:attention={snapshot.doctor.nextSetupAction !== "READY"}>
            {snapshot.doctor.nextSetupAction === "READY" ? "Ready" : actionLabel(snapshot.doctor.nextSetupAction)}
          </div>
        {/if}
      </div>
    </header>

    {#if error}
      <section class="error-banner" aria-live="polite">
        <div>
          <strong>Backend unavailable</strong>
          <span>{error}</span>
        </div>
        <button on:click={refresh}>Retry</button>
      </section>
    {/if}

    {#if supportPath}
      <section class="notice" aria-live="polite">
        <div>
          <strong>Support bundle created</strong>
          <code>{supportPath}</code>
        </div>
        <button on:click={() => (supportPath = "")}>Dismiss</button>
      </section>
    {/if}

    {#if loading && !snapshot}
      <section class="loading-panel">
        <div class="spinner"></div>
        <strong>Connecting to Virtual Clients…</strong>
      </section>
    {:else if snapshot}
      {#if page === "setup"}
        <section class="page-intro">
          <span class="eyebrow">GUIDED SETUP</span>
          <h2>{snapshot.doctor.nextSetupAction === "READY" ? "Virtual Clients is ready to use" : "One step at a time"}</h2>
          <p>
            {snapshot.doctor.nextSetupAction === "READY"
              ? "All backend setup gates are satisfied. Open Clients to start or manage Virtual machines."
              : "Follow the current engine action below. The app only advances when the backend reports the next safe step."}
          </p>
        </section>

        <section class="setup-focus" class:ready={snapshot.doctor.nextSetupAction === "READY"}>
          <div class="step-number">{snapshot.doctor.nextSetupAction === "READY" ? "✓" : "→"}</div>
          <div class="setup-copy">
            <span class="eyebrow">CURRENT STEP</span>
            <h2>{actionLabel(snapshot.doctor.nextSetupAction)}</h2>
            <p>{setupHint(snapshot.doctor.nextSetupAction)}</p>
          </div>
          <div class="setup-action">
            {#if primarySetupAction()}
              <button class="primary large" disabled={Boolean(busy)} on:click={primarySetupAction()}>
                {busy === "setup" ? "Working…" : actionLabel(snapshot.doctor.nextSetupAction)}
              </button>
            {:else if snapshot.doctor.nextSetupAction === "READY"}
              <button class="primary large" on:click={() => selectPage("clients")}>Open clients</button>
            {:else if snapshot.doctor.nextSetupAction === "CREATE_READY_SNAPSHOTS" || snapshot.doctor.nextSetupAction === "REPROVISION_VIRTUALS"}
              <button class="secondary large" on:click={() => selectPage("clients")}>Open client actions</button>
            {:else}
              <span class="manual-note">Complete this step outside the app, then refresh.</span>
            {/if}
          </div>
        </section>

        <section class="setup-summary">
          <article>
            <span>Provider</span>
            <strong>{snapshot.doctor.provider ?? "Not available"}</strong>
            <small>{snapshot.doctor.provider ? "Detected" : "Required before Virtuals can run"}</small>
          </article>
          <article>
            <span>Base</span>
            <strong>{snapshot.doctor.baseState ?? "Not ready"}</strong>
            <small>{snapshot.doctor.baseVmPresent ? "Base VM detected" : "Base VM not detected"}</small>
          </article>
          <article>
            <span>Version parity</span>
            <strong>{snapshot.diagnostics.runtime.runtimeProfile.parity}</strong>
            <small>Native ↔ Base lineage</small>
          </article>
          <article>
            <span>QA_READY</span>
            <strong>{readyVirtuals} / {virtuals.length || policy?.maxVirtualClients || 3}</strong>
            <small>Virtual clients with a ready snapshot</small>
          </article>
        </section>

        {#if blockers.length}
          <button class="health-callout" on:click={() => selectPage("health")}>
            <div>
              <span class="eyebrow">BLOCKED</span>
              <strong>{blockers.length} setup blocker{blockers.length === 1 ? "" : "s"} need attention</strong>
            </div>
            <span>View health →</span>
          </button>
        {/if}
      {:else if page === "clients"}
        <section class="page-intro compact-intro">
          <span class="eyebrow">DAILY USE</span>
          <h2>Native + Virtual clients</h2>
          <p>Start the number of Virtual clients you need, then open and control each client independently.</p>
        </section>

        <section class="batch-bar">
          <div>
            <strong>{runningVirtuals} Virtual{runningVirtuals === 1 ? "" : "s"} running</strong>
            <small>{snapshot.diagnostics.runtime.pressure.canStartVirtual ? "Host allows new starts" : "New starts are currently blocked by host pressure"}</small>
          </div>
          <div class="batch-actions">
            {#if policy}
              {#each Array(policy.maxVirtualClients) as _, index}
                <button
                  class={index === policy.maxVirtualClients - 1 ? "primary" : "secondary"}
                  disabled={Boolean(busy) || !snapshot.diagnostics.runtime.pressure.canStartVirtual}
                  on:click={() => mutate(`start-${index + 1}`, () => backend.start(index + 1))}
                >
                  {busy === `start-${index + 1}` ? "Starting…" : `Start ${index + 1}`}
                </button>
              {/each}
            {/if}
            <button class="secondary danger-soft" disabled={Boolean(busy)} on:click={() => mutate("stop-all", () => backend.stop())}>
              {busy === "stop-all" ? "Stopping…" : "Stop all"}
            </button>
          </div>
        </section>

        <section class="client-grid">
          {#if native}
            <article class="client-card native">
              <header>
                <div>
                  <span class="client-kind">PHYSICAL HOST</span>
                  <h3>{native.id}</h3>
                </div>
                <span class="state running">{stateLabel(native.state)}</span>
              </header>
              <div class="client-primary">
                <span>Minecraft Education</span>
                <strong>{native.minecraftVersion ?? "Unknown version"}</strong>
              </div>
              <dl>
                <div><dt>Role</dt><dd>Version authority</dd></div>
                <div><dt>Lifecycle</dt><dd>Managed manually</dd></div>
                <div><dt>Identity</dt><dd>Physical host</dd></div>
              </dl>
            </article>
          {/if}

          {#each virtuals as client}
            {@const available = clientActions(client)}
            <article class="client-card">
              <header>
                <div>
                  <span class="client-kind">VIRTUAL CLIENT</span>
                  <h3>{client.id}</h3>
                </div>
                <span class="state {client.state.toLowerCase()}">{stateLabel(client.state)}</span>
              </header>

              <div class="client-primary">
                <span>Minecraft Education</span>
                <strong>{client.minecraftVersion ?? "Not running"}</strong>
              </div>

              <div class="readiness-line">
                <span class:good={client.readySnapshot === true}></span>
                <strong>{client.readySnapshot === true ? "QA_READY saved" : "QA_READY not saved"}</strong>
              </div>

              <dl class="client-details">
                <div><dt>Working set</dt><dd>{client.hostWorkingSetMb != null ? `${client.hostWorkingSetMb} MB` : "—"}</dd></div>
                <div><dt>Guest Agent</dt><dd>{client.guestAgentReady === true ? "Ready" : client.guestAgentReady === false ? "Unavailable" : "Unknown"}</dd></div>
                <div><dt>VM identity</dt><dd>{client.vmIdentity ?? "—"}</dd></div>
                <div><dt>Windows identity</dt><dd>{client.windowsIdentity ?? "—"}</dd></div>
              </dl>

              {#if available}
                <div class="client-actions primary-actions">
                  <button
                    class="primary compact"
                    disabled={!available.open.allowed || Boolean(busy)}
                    title={blockerLabel(available.open.blocker)}
                    on:click={() => mutate(`open-${client.id}`, () => backend.open(client.id))}
                  >Open</button>
                  <button
                    class="secondary compact"
                    disabled={!available.start.allowed || Boolean(busy)}
                    title={blockerLabel(available.start.blocker)}
                    on:click={() => mutate(`start-${client.id}`, () => backend.start(Number(client.id.slice(-2))))}
                  >Start</button>
                  <button
                    class="secondary compact"
                    disabled={!available.stop.allowed || Boolean(busy)}
                    title={blockerLabel(available.stop.blocker)}
                    on:click={() => mutate(`stop-${client.id}`, () => backend.stop(client.id))}
                  >Stop</button>
                </div>
                <details class="more-actions">
                  <summary>More actions</summary>
                  <div class="client-actions">
                    <button class="secondary compact" disabled={!available.restart.allowed || Boolean(busy)} title={blockerLabel(available.restart.blocker)} on:click={() => mutate(`restart-${client.id}`, () => backend.restart(client.id))}>Restart</button>
                    <button class="secondary compact" disabled={!available.suspend.allowed || Boolean(busy)} title={blockerLabel(available.suspend.blocker)} on:click={() => mutate(`suspend-${client.id}`, () => backend.suspend(client.id))}>Suspend</button>
                    <button class="secondary compact" disabled={!available.setReady.allowed || Boolean(busy)} title={blockerLabel(available.setReady.blocker)} on:click={() => mutate(`ready-${client.id}`, () => backend.setReady(client.id))}>Save QA_READY</button>
                    <button class="secondary compact" disabled={!available.reset.allowed || Boolean(busy)} title={blockerLabel(available.reset.blocker)} on:click={() => mutate(`reset-${client.id}`, () => backend.reset(client.id))}>Reset to QA_READY</button>
                    <button class="secondary compact danger-soft" disabled={!available.reprovision.allowed || Boolean(busy)} title={blockerLabel(available.reprovision.blocker)} on:click={() => (confirmReprovision = client.id)}>Reprovision</button>
                  </div>
                </details>
              {/if}
            </article>
          {/each}
        </section>
      {:else if page === "health"}
        <section class="page-intro compact-intro">
          <span class="eyebrow">SYSTEM HEALTH</span>
          <h2>{blockers.length === 0 ? "No blocking engine issues" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} detected`}</h2>
          <p>Technical diagnostics live here so daily client controls stay uncluttered.</p>
        </section>

        <section class="metrics">
          <article>
            <span>Available memory</span>
            <strong>{Math.round(snapshot.diagnostics.host.availableMemoryMb / 1024)} GB</strong>
            <small>of {Math.round(snapshot.diagnostics.host.totalMemoryMb / 1024)} GB</small>
          </article>
          <article>
            <span>CPU</span>
            <strong>{snapshot.diagnostics.host.logicalCpus}</strong>
            <small>logical processors</small>
          </article>
          <article>
            <span>Pressure</span>
            <strong>{snapshot.diagnostics.runtime.pressure.level}</strong>
            <small>{snapshot.diagnostics.runtime.pressure.canStartVirtual ? "new starts allowed" : "new starts blocked"}</small>
          </article>
          <article>
            <span>Version parity</span>
            <strong>{snapshot.diagnostics.runtime.runtimeProfile.parity}</strong>
            <small>Minecraft Education lineage</small>
          </article>
        </section>

        <section class="health-panel">
          <header class="section-title">
            <div>
              <span class="eyebrow">ENGINE ISSUES</span>
              <h2>{blockers.length} blockers · {warnings.length} warnings</h2>
            </div>
          </header>
          {#if issues.length === 0}
            <div class="healthy-empty">
              <strong>Healthy</strong>
              <span>The backend reports no blocker or warning.</span>
            </div>
          {:else}
            <div class="issue-list">
              {#each issues as issue}
                <div class="issue {issue.severity.toLowerCase()}">
                  <b>{issue.severity}</b>
                  <span>{issueLabel(issue)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        {#if update}
          <section class="utility-card">
            <div>
              <span class="eyebrow">APPLICATION UPDATE</span>
              <strong>{updateLabel(update.state)}</strong>
              <small>
                Current {update.currentVersion}
                {#if update.latestVersion} · Latest {update.latestVersion}{/if}
                {#if update.reason} · {update.reason}{/if}
              </small>
            </div>
            {#if update.state === "UPDATE_AVAILABLE"}
              <button class="secondary" disabled={Boolean(busy)} on:click={stageUpdate}>
                {busy === "stage-update" ? "Staging…" : "Stage update"}
              </button>
            {:else if update.state === "UPDATE_STAGED"}
              <span class="staged">Installer staged</span>
            {/if}
          </section>
        {/if}

        <section class="utility-card">
          <div>
            <span class="eyebrow">SUPPORT</span>
            <strong>Create diagnostic bundle</strong>
            <small>Produces the bounded backend support artifact without account credentials, tokens, or world content.</small>
          </div>
          <button class="secondary" disabled={busy === "support"} on:click={createSupportBundle}>
            {busy === "support" ? "Creating…" : "Create support bundle"}
          </button>
        </section>
      {:else}
        <section class="page-intro compact-intro">
          <span class="eyebrow">OPERATION JOURNAL</span>
          <h2>Recent engine operations</h2>
          <p>Use this view when checking what changed or diagnosing a failed lifecycle action.</p>
        </section>

        <section class="history-panel">
          {#if history.length === 0}
            <div class="empty">No recorded mutation operations.</div>
          {:else}
            <div class="history-list">
              {#each [...history].reverse().slice(0, 40) as item}
                <div class="history-row">
                  <time>{new Date(item.timestampUnixMs).toLocaleString()}</time>
                  <strong>{item.operation}</strong>
                  <span>{item.target ?? "—"}</span>
                  <b class:failed={item.outcome === "FAILED"}>{item.outcome}</b>
                  <code>{item.errorCode ?? ""}</code>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {/if}
  </main>

  {#if confirmReprovision}
    <div class="modal-backdrop" role="presentation" on:click={() => (confirmReprovision = undefined)}>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="reprovision-title" on:click|stopPropagation>
        <span class="eyebrow">DESTRUCTIVE ACTION</span>
        <h2 id="reprovision-title">Reprovision {confirmReprovision}?</h2>
        <p>
          This destroys the selected Virtual guest state, saved Microsoft/Minecraft session,
          local guest configuration, and QA_READY snapshot. The Base and other Virtual clients are not changed.
        </p>
        <div class="modal-actions">
          <button class="secondary" on:click={() => (confirmReprovision = undefined)}>Cancel</button>
          <button class="danger" disabled={Boolean(busy)} on:click={reprovisionConfirmed}>Destroy guest state & reprovision</button>
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  :global(*){box-sizing:border-box}
  :global(html){background:#080b0e}
  :global(body){margin:0;background:#080b0e;color:#eef1f4;font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  :global(button){font:inherit}
  :global(button:focus-visible),:global(summary:focus-visible){outline:2px solid #8e97ff;outline-offset:2px}
  .app-shell{min-height:100vh;display:grid;grid-template-columns:244px minmax(0,1fr)}
  .rail{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:20px 14px;border-right:1px solid #20262d;background:#0d1115}
  .brand{display:flex;align-items:center;gap:11px;padding:4px 8px 24px}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid #36404b;border-radius:9px;background:#141a20;font-size:11px;font-weight:800;letter-spacing:.07em}.brand>div:last-child{display:grid}.brand span{font-size:10px;color:#7b8793}
  nav{display:grid;gap:5px}.nav-item,.quiet{border:0;border-radius:9px;background:transparent;color:#87929d;padding:10px;text-align:left;cursor:pointer}.nav-item{display:grid;gap:2px}.nav-item>span{font-weight:700}.nav-item small{font-size:9px;color:#66727d}.nav-item:hover,.quiet:hover{background:#141a20;color:#dbe1e7}.nav-item.active{background:#171d24;color:#fff}.nav-item.active small{color:#8f9ba6}
  .rail-bottom{margin-top:auto;display:grid;gap:10px}.policy-note{display:grid;gap:4px;padding:12px;border:1px solid #202832;border-radius:9px;background:#10151a}.policy-note span,.eyebrow,.client-kind{font-size:9px;font-weight:800;letter-spacing:.12em;color:#74808c}.policy-note strong{font-size:11px}.policy-note small{font-size:10px;color:#75818c}
  main{min-width:0;padding-bottom:64px}.topbar{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid #20262d;background:#0b0f13}.topbar h1{margin:3px 0 0;font-size:19px;line-height:1.2}.top-actions{display:flex;align-items:center;gap:10px}.provider-state{display:flex;align-items:center;gap:7px;color:#87929d;font-size:11px}.provider-state>span{width:7px;height:7px;border-radius:50%;background:#59616a}.provider-state>span.online{background:#6ed6a0;box-shadow:0 0 0 3px #173126}.ready-state{padding:5px 8px;border-radius:999px;background:#123123;color:#86e3ae;font-size:9px;font-weight:800}.ready-state.attention{background:#342b16;color:#e8c877}
  button{border:1px solid #303842;border-radius:7px;background:#151a20;color:#c6cdd5;padding:8px 11px;cursor:pointer}button:disabled{opacity:.35;cursor:not-allowed}.primary{background:#7f88ff;border-color:#9198ff;color:#090b0e;font-weight:750}.secondary{background:#11161b}.compact{padding:7px 9px;font-size:11px}.large{padding:10px 14px}.danger-soft{color:#f0a8ae}.danger{background:#9f3541;border-color:#b54b57;color:#fff;font-weight:750}
  .error-banner,.notice{margin:18px 30px 0;padding:12px 14px;border:1px solid #57343a;border-radius:9px;background:#171013;display:flex;justify-content:space-between;gap:16px;align-items:center}.error-banner div,.notice>div{display:grid;gap:2px;font-size:11px}.error-banner span{color:#d1aeb2}.notice{border-color:#284b3b;background:#0f1814}.notice code{color:#9fd4b8;overflow-wrap:anywhere}
  .loading-panel{min-height:360px;display:grid;place-items:center;align-content:center;gap:13px;color:#8e99a4}.spinner{width:22px;height:22px;border:2px solid #2f3842;border-top-color:#8e97ff;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .page-intro{margin:34px 30px 0;max-width:760px}.page-intro h2{margin:7px 0 8px;font-size:27px;letter-spacing:-.02em}.page-intro p{margin:0;color:#8e99a4;max-width:680px}.compact-intro{margin-top:28px}.compact-intro h2{font-size:22px}
  .setup-focus{margin:24px 30px 0;min-height:178px;padding:22px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;border:1px solid #423925;border-radius:13px;background:#15130f}.setup-focus.ready{border-color:#294334;background:#101713}.step-number{width:46px;height:46px;display:grid;place-items:center;border:1px solid #3a424c;border-radius:12px;background:#0d1115;font-size:22px;font-weight:800}.setup-copy h2{margin:5px 0 7px;font-size:22px}.setup-copy p{margin:0;color:#959fa8;max-width:700px}.setup-action{display:grid;justify-items:end;gap:7px}.manual-note{max-width:190px;color:#9aa4ad;font-size:10px;text-align:right}
  .setup-summary,.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 30px}.setup-summary article,.metrics article{display:grid;gap:2px;padding:14px;border:1px solid #202832;border-radius:10px;background:#0f1419}.setup-summary span,.setup-summary small,.metrics span,.metrics small{font-size:10px;color:#75818d}.setup-summary strong{font-size:14px}.metrics strong{font-size:18px}.health-callout{width:calc(100% - 60px);margin:4px 30px 0;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-color:#57343a;background:#171013;text-align:left}.health-callout>div{display:grid;gap:3px}.health-callout>span{color:#d7a6ab;font-size:11px}
  .batch-bar{margin:22px 30px 0;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #202832;border-radius:11px;background:#0f1419}.batch-bar>div:first-child{display:grid;gap:2px}.batch-bar small{font-size:10px;color:#76828d}.batch-actions{display:flex;gap:6px;flex-wrap:wrap}
  .client-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:10px 30px}.client-card{min-width:0;padding:16px;border:1px solid #202832;border-radius:11px;background:#0d1217}.client-card.native{background:#10151b}.client-card>header{display:flex;justify-content:space-between;gap:10px}.client-card h3{margin:3px 0 0;font-size:16px}.state{height:max-content;border-radius:999px;padding:3px 7px;background:#202831;color:#9ba7b2;font-size:9px;font-weight:800}.state.running{background:#123123;color:#86e3ae}.state.suspended{background:#322914;color:#e7ca7a}.state.error{background:#391820;color:#f4a0aa}.state.not_provisioned{background:#1c2229}
  .client-primary{display:grid;gap:2px;margin:18px 0 0}.client-primary span{font-size:9px;color:#74808c}.client-primary strong{font-size:13px}.readiness-line{display:flex;align-items:center;gap:7px;margin-top:12px;padding:8px;border-radius:7px;background:#12181d;font-size:10px}.readiness-line>span{width:7px;height:7px;border-radius:50%;background:#6c747c}.readiness-line>span.good{background:#68d498}.readiness-line strong{font-size:10px}
  dl{margin:15px 0 0;display:grid;gap:8px}dl div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #1b2229;padding-bottom:7px}dt,dd{margin:0;font-size:10px}dt{color:#71808d}dd{color:#c3cbd3;text-align:right;overflow:hidden;text-overflow:ellipsis}.client-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}.primary-actions{margin-top:16px}.more-actions{margin-top:8px;border-top:1px solid #1d242b;padding-top:8px}.more-actions summary{cursor:pointer;color:#83909b;font-size:10px;user-select:none}
  .health-panel,.history-panel,.utility-card{margin:14px 30px 0;border:1px solid #202832;border-radius:11px;background:#0d1217;overflow:hidden}.section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px}.section-title h2{margin:3px 0 0;font-size:18px}.issue-list{display:grid;gap:1px;border-top:1px solid #202832;background:#202832}.issue{display:flex;gap:10px;align-items:center;padding:10px 14px;background:#0d1217;font-size:10px}.issue b{width:58px;font-size:8px}.issue.blocker b{color:#ff9da6}.issue.warning b{color:#e9c477}.issue span{color:#a5afb8;text-transform:capitalize}.healthy-empty{display:grid;gap:3px;padding:22px 16px;border-top:1px solid #202832}.healthy-empty strong{color:#86dba9}.healthy-empty span{font-size:10px;color:#75818d}.utility-card{padding:15px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px}.utility-card>div{display:grid;gap:3px}.utility-card>div>strong{font-size:14px}.utility-card small{color:#808c97}.staged{font-size:10px;font-weight:800;color:#9fc8e8}
  .history-list{display:grid}.history-row{display:grid;grid-template-columns:160px 150px 1fr 80px 130px;gap:12px;padding:10px 16px;border-top:1px solid #1c232a;align-items:center;font-size:10px}.history-row:first-child{border-top:0}.history-row time,.history-row span{color:#7f8b96}.history-row b{color:#86dba9}.history-row b.failed{color:#f0a1aa}.history-row code{color:#b3bdc6}.empty{padding:28px 16px;color:#74818c}
  .modal-backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:rgba(3,6,9,.72);backdrop-filter:blur(5px)}.modal{width:min(520px,100%);padding:22px;border:1px solid #433139;border-radius:13px;background:#11151a;box-shadow:0 22px 70px rgba(0,0,0,.45)}.modal h2{margin:6px 0 10px}.modal p{margin:0;color:#aab3bc}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}
  @media(max-width:1180px){.client-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.setup-summary,.metrics{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:820px){.app-shell{grid-template-columns:1fr}.rail{position:static;height:auto;border-right:0;border-bottom:1px solid #20262d}.brand{padding-bottom:12px}.rail nav{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.rail-bottom{display:none}.nav-item{text-align:center}.nav-item small{display:none}.topbar{padding:0 16px}.provider-state{display:none}.page-intro,.setup-focus,.setup-summary,.metrics,.batch-bar,.client-grid,.health-panel,.history-panel,.utility-card,.error-banner,.notice{margin-left:16px;margin-right:16px}.health-callout{width:calc(100% - 32px);margin-left:16px;margin-right:16px}.setup-focus{grid-template-columns:1fr}.step-number{display:none}.setup-action{justify-items:start}.manual-note{text-align:left;max-width:none}.client-grid,.setup-summary,.metrics{grid-template-columns:1fr}.batch-bar,.utility-card{align-items:flex-start;flex-direction:column}.history-row{grid-template-columns:1fr 1fr}.history-row code{grid-column:1/-1}}
</style>
