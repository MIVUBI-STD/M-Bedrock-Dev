<script lang="ts">
  import { onMount } from "svelte";
  import { backend, desktop, BackendBridgeError } from "./app/bridge/virtualClientsApi.js";
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
    clientDisplayName,
    issueLabel,
    primaryClientAction,
    recoveryLabel,
    setupHint,
    stateLabel,
    updateLabel,
  } from "./view-model.js";

  type Page = "setup" | "clients" | "settings" | "support";

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
  let arrangeMessage = "";
  let page: Page = "setup";
  let pageChosen = false;
  let historyOpen = false;
  let diagnosticsOpen = false;

  $: clients = snapshot?.diagnostics.runtime.clients ?? [];
  $: native = clients.find((client) => client.native);
  $: virtuals = clients.filter((client) => !client.native);
  $: issues = snapshot?.doctor.issues ?? [];
  $: blockers = issues.filter((issue) => issue.severity === "BLOCKER");
  $: warnings = issues.filter((issue) => issue.severity === "WARNING");
  $: runningVirtuals = virtuals.filter((client) => client.state === "RUNNING").length;
  $: readyVirtuals = virtuals.filter((client) => client.readySnapshot === true).length;
  $: setupComplete = snapshot?.doctor.nextSetupAction === "READY";

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
      if (page === "setup" && nextSnapshot.doctor.nextSetupAction === "READY" && pageChosen) {
        page = "clients";
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

  async function runPrimaryClientAction(client: ClientStatus, available: ClientLifecycleActions) {
    const primary = primaryClientAction(available);
    if (!primary) return;
    if (primary.kind === "open") {
      await mutate(`open-${client.id}`, () => backend.open(client.id));
    } else {
      await mutate(`start-${client.id}`, () => backend.start(Number(client.id.slice(-2))));
    }
  }

  async function startAll() {
    if (!policy) return;
    const count = policy.maxVirtualClients;
    await mutate("start-all", () => backend.start(count));
  }

  async function arrangeWindows() {
    busy = "arrange";
    error = "";
    arrangeMessage = "";
    try {
      for (const client of virtuals) {
        const available = clientActions(client);
        if (client.state === "RUNNING" && available?.open.allowed) {
          await backend.open(client.id);
        }
      }
      const result = await desktop.arrangeWindows();
      if (result.arranged.length === 0) {
        throw new BackendBridgeError(
          "WINDOWS_NOT_FOUND",
          "No Minecraft client windows are currently open.",
          true,
        );
      }
      const missingNative = result.missing.includes("Native");
      arrangeMessage = `${result.arranged.length} window${result.arranged.length === 1 ? "" : "s"} arranged${missingNative ? " · This PC was not open" : ""}`;
    } catch (value) {
      error = errorMessage(value);
    } finally {
      busy = "";
    }
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
      {#if !setupComplete}
        <button class:active={page === "setup"} class="nav-item" on:click={() => selectPage("setup")}>
          <span>Setup</span>
          <small>{actionLabel(snapshot?.doctor.nextSetupAction ?? "PREPARE_BASE")}</small>
        </button>
      {/if}
      <button class:active={page === "clients"} class="nav-item" on:click={() => selectPage("clients")}>
        <span>Clients</span>
        <small>{runningVirtuals} running · {readyVirtuals} ready</small>
      </button>
      <button class:active={page === "settings"} class="nav-item" on:click={() => selectPage("settings")}>
        <span>Settings</span>
        <small>App & performance</small>
      </button>
      <button class:active={page === "support"} class="nav-item" on:click={() => selectPage("support")}>
        <span>Help & Support</span>
        <small>{blockers.length ? `${blockers.length} need attention` : "System status"}</small>
      </button>
    </nav>

    <div class="rail-bottom">
      <div class="system-chip" class:attention={!setupComplete || blockers.length > 0}>
        <span></span>
        <div>
          <strong>{setupComplete && blockers.length === 0 ? "System ready" : "Attention needed"}</strong>
          <small>{snapshot?.doctor.provider ?? "Virtualization unavailable"}</small>
        </div>
      </div>
      <button class="quiet" disabled={loading || Boolean(busy)} on:click={refresh}>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  </aside>

  <main>
    <header class="topbar">
      <div>
        <span class="eyebrow">M-BEDROCK / VIRTUAL CLIENTS</span>
        <h1>{page === "setup" ? "Setup" : page === "clients" ? "Clients" : page === "settings" ? "Settings" : "Help & Support"}</h1>
      </div>
      {#if snapshot}
        <div class="ready-state" class:attention={!setupComplete || blockers.length > 0}>
          {setupComplete && blockers.length === 0 ? "Ready" : blockers.length ? "Needs attention" : "Setup required"}
        </div>
      {/if}
    </header>

    {#if error}
      <section class="error-banner" aria-live="polite">
        <div>
          <strong>Virtual Clients could not connect</strong>
          <span>{error}</span>
        </div>
        <button on:click={refresh}>Try again</button>
      </section>
    {/if}

    {#if arrangeMessage}
      <section class="notice" aria-live="polite">
        <div>
          <strong>Windows arranged</strong>
          <span>{arrangeMessage}</span>
        </div>
        <button on:click={() => (arrangeMessage = "")}>Dismiss</button>
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
        <strong>Checking Virtual Clients…</strong>
      </section>
    {:else if snapshot}
      {#if page === "setup"}
        <section class="hero">
          <span class="eyebrow">FIRST-TIME SETUP</span>
          <h2>Get your virtual Minecraft clients ready</h2>
          <p>Follow one step at a time. Technical setup details stay in the background unless something needs attention.</p>
        </section>

        <section class="setup-focus">
          <div class="step-number">→</div>
          <div class="setup-copy">
            <span class="eyebrow">CURRENT STEP</span>
            <h2>{actionLabel(snapshot.doctor.nextSetupAction)}</h2>
            <p>{setupHint(snapshot.doctor.nextSetupAction)}</p>
          </div>
          <div class="setup-action">
            {#if primarySetupAction()}
              <button class="primary large" disabled={Boolean(busy)} on:click={primarySetupAction()}>
                {busy === "setup" ? "Working…" : "Continue"}
              </button>
            {:else if snapshot.doctor.nextSetupAction === "CREATE_READY_SNAPSHOTS" || snapshot.doctor.nextSetupAction === "REPROVISION_VIRTUALS"}
              <button class="primary large" on:click={() => selectPage("clients")}>Continue with clients</button>
            {:else}
              <span class="manual-note">Complete this step, then refresh the app.</span>
            {/if}
          </div>
        </section>

        <section class="progress-row">
          <article class:done={Boolean(snapshot.doctor.provider)}><span>1</span><div><strong>Computer</strong><small>{snapshot.doctor.provider ? "Ready" : "Needs setup"}</small></div></article>
          <article class:done={snapshot.doctor.baseState === "FINALIZED"}><span>2</span><div><strong>Environment</strong><small>{snapshot.doctor.baseState === "FINALIZED" ? "Ready" : "Preparing"}</small></div></article>
          <article class:done={virtuals.length > 0 && virtuals.every((client) => client.state !== "NOT_PROVISIONED")}><span>3</span><div><strong>Virtual clients</strong><small>{virtuals.length > 0 && virtuals.every((client) => client.state !== "NOT_PROVISIONED") ? "Created" : "Not ready"}</small></div></article>
          <article class:done={readyVirtuals === virtuals.length && virtuals.length > 0}><span>4</span><div><strong>Accounts</strong><small>{readyVirtuals === virtuals.length && virtuals.length > 0 ? "Complete" : `${readyVirtuals} of ${virtuals.length || 3} ready`}</small></div></article>
        </section>
      {:else if page === "clients"}
        <section class="hero compact">
          <span class="eyebrow">DAILY USE</span>
          <h2>Your Minecraft clients</h2>
          <p>Start what you need, open each client, and keep recovery actions out of the way until they are needed.</p>
        </section>

        <section class="batch-bar">
          <div>
            <strong>{runningVirtuals === 0 ? "No virtual clients running" : `${runningVirtuals} virtual client${runningVirtuals === 1 ? "" : "s"} running`}</strong>
            <small>{snapshot.diagnostics.runtime.pressure.canStartVirtual ? "Automatic resource protection is active" : "This PC is under resource pressure; new starts are paused"}</small>
          </div>
          <div class="batch-actions">
            <button
              class="primary"
              disabled={Boolean(busy) || !snapshot.diagnostics.runtime.pressure.canStartVirtual || !policy}
              on:click={startAll}
            >
              {busy === "start-all" ? "Starting…" : "Start all"}
            </button>
            <button
              class="secondary"
              disabled={Boolean(busy) || runningVirtuals === 0 || !desktop.canArrangeWindows()}
              on:click={arrangeWindows}
            >
              {busy === "arrange" ? "Arranging…" : "Arrange"}
            </button>
            <button class="secondary" disabled={Boolean(busy) || runningVirtuals === 0} on:click={() => mutate("stop-all", () => backend.stop())}>
              {busy === "stop-all" ? "Stopping…" : "Stop all"}
            </button>
          </div>
        </section>

        <section class="client-list">
          {#if native}
            <article class="client-row native">
              <div class="client-icon">PC</div>
              <div class="client-main">
                <span class="client-kind">PHYSICAL CLIENT</span>
                <h3>{clientDisplayName(native.id)}</h3>
                <small>Minecraft Education {native.minecraftVersion ?? "version unknown"} · Version reference</small>
              </div>
              <span class="state running">{stateLabel(native.state)}</span>
              <div class="row-action"><span class="managed">Managed on this PC</span></div>
            </article>
          {/if}

          {#each virtuals as client}
            {@const available = clientActions(client)}
            {@const primary = primaryClientAction(available)}
            <article class="client-row">
              <div class="client-icon">{Number(client.id.slice(-2))}</div>
              <div class="client-main">
                <span class="client-kind">VIRTUAL CLIENT</span>
                <h3>{clientDisplayName(client.id)}</h3>
                <small>
                  {client.minecraftVersion ? `Minecraft Education ${client.minecraftVersion}` : "Minecraft Education"}
                  · {recoveryLabel(client.readySnapshot)}
                </small>
              </div>
              <span class="state {client.state.toLowerCase()}">{stateLabel(client.state)}</span>
              <div class="row-action">
                {#if available && primary}
                  <button class="primary" disabled={Boolean(busy)} on:click={() => runPrimaryClientAction(client, available)}>
                    {busy.endsWith(client.id) ? "Working…" : primary.label}
                  </button>
                {:else}
                  <button class="secondary" disabled>Unavailable</button>
                {/if}
                {#if available}
                  <details class="manage-menu">
                    <summary aria-label={`Manage ${clientDisplayName(client.id)}`}>•••</summary>
                    <div class="menu-panel">
                      <button disabled={!available.restart.allowed || Boolean(busy)} title={blockerLabel(available.restart.blocker)} on:click={() => mutate(`restart-${client.id}`, () => backend.restart(client.id))}>Restart</button>
                      <button disabled={!available.suspend.allowed || Boolean(busy)} title={blockerLabel(available.suspend.blocker)} on:click={() => mutate(`suspend-${client.id}`, () => backend.suspend(client.id))}>Pause</button>
                      <button disabled={!available.stop.allowed || Boolean(busy)} title={blockerLabel(available.stop.blocker)} on:click={() => mutate(`stop-${client.id}`, () => backend.stop(client.id))}>Stop</button>
                      <hr />
                      <button disabled={!available.setReady.allowed || Boolean(busy)} title={blockerLabel(available.setReady.blocker)} on:click={() => mutate(`ready-${client.id}`, () => backend.setReady(client.id))}>Save recovery point</button>
                      <button disabled={!available.reset.allowed || Boolean(busy)} title={blockerLabel(available.reset.blocker)} on:click={() => mutate(`reset-${client.id}`, () => backend.reset(client.id))}>Restore recovery point</button>
                      <button class="danger-menu" disabled={!available.reprovision.allowed || Boolean(busy)} title={blockerLabel(available.reprovision.blocker)} on:click={() => (confirmReprovision = client.id)}>Recreate virtual client</button>
                    </div>
                  </details>
                {/if}
              </div>
            </article>
          {/each}
        </section>

        {#if blockers.length}
          <button class="support-callout" on:click={() => selectPage("support")}>
            <div><strong>{blockers.length} item{blockers.length === 1 ? "" : "s"} need attention</strong><small>See what needs to be fixed before continuing.</small></div>
            <span>Open support →</span>
          </button>
        {/if}
      {:else if page === "settings"}
        <section class="hero compact">
          <span class="eyebrow">SETTINGS</span>
          <h2>Keep the default simple</h2>
          <p>Virtual Clients manages resource safety automatically. Advanced runtime details remain read-only until the backend exposes a safe user setting.</p>
        </section>

        <section class="settings-card">
          <div>
            <span class="eyebrow">PERFORMANCE</span>
            <h3>Automatic</h3>
            <p>The app watches available memory and host pressure before starting additional virtual clients.</p>
          </div>
          <div class="setting-meta">
            <span>{policy?.virtualMemoryLimitMb ? `${policy.virtualMemoryLimitMb / 1024} GB` : "—"} ceiling per client</span>
            <span>{policy?.virtualVcpus ?? "—"} vCPU per client</span>
            <span>Up to {policy?.maxVirtualClients ?? 3} virtual clients</span>
          </div>
        </section>

        {#if update}
          <section class="settings-card">
            <div>
              <span class="eyebrow">APPLICATION UPDATE</span>
              <h3>{updateLabel(update.state)}</h3>
              <p>
                Current {update.currentVersion}
                {#if update.latestVersion} · Latest {update.latestVersion}{/if}
              </p>
            </div>
            <div>
              {#if update.state === "UPDATE_AVAILABLE"}
                <button class="secondary" disabled={Boolean(busy)} on:click={stageUpdate}>
                  {busy === "stage-update" ? "Preparing…" : "Prepare update"}
                </button>
              {:else if update.state === "UPDATE_STAGED"}
                <span class="badge">Ready to install</span>
              {/if}
            </div>
          </section>
        {/if}

        <section class="settings-card">
          <div>
            <span class="eyebrow">VERSION COMPATIBILITY</span>
            <h3>{snapshot.diagnostics.runtime.runtimeProfile.parity === "MATCH" ? "Minecraft versions match" : "Needs attention"}</h3>
            <p>Virtual clients follow the Minecraft Education version installed on this PC.</p>
          </div>
          <span class="badge">{snapshot.diagnostics.runtime.runtimeProfile.parity}</span>
        </section>
      {:else}
        <section class="hero compact">
          <span class="eyebrow">HELP & SUPPORT</span>
          <h2>{blockers.length === 0 ? "System looks good" : "Some items need attention"}</h2>
          <p>Normal use stays simple. Technical details are available here only when you need them.</p>
        </section>

        <section class="support-summary">
          <article>
            <span>System</span>
            <strong>{blockers.length === 0 ? "Ready" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}</strong>
          </article>
          <article>
            <span>Available memory</span>
            <strong>{Math.round(snapshot.diagnostics.host.availableMemoryMb / 1024)} GB</strong>
          </article>
          <article>
            <span>Resource pressure</span>
            <strong>{snapshot.diagnostics.runtime.pressure.level}</strong>
          </article>
          <article>
            <span>Virtualization</span>
            <strong>{snapshot.doctor.provider ?? "Unavailable"}</strong>
          </article>
        </section>

        <section class="support-card">
          <header>
            <div><span class="eyebrow">WHAT NEEDS ATTENTION</span><h3>{blockers.length} blockers · {warnings.length} warnings</h3></div>
          </header>
          {#if issues.length === 0}
            <div class="healthy-empty"><strong>Everything is ready</strong><span>No backend blocker or warning is currently reported.</span></div>
          {:else}
            <div class="issue-list">
              {#each issues as issue}
                <div class="issue {issue.severity.toLowerCase()}">
                  <b>{issue.severity === "BLOCKER" ? "ACTION" : "CHECK"}</b>
                  <span>{issueLabel(issue)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <section class="support-tools">
          <button class="tool-card" on:click={() => (historyOpen = !historyOpen)}>
            <strong>Operation history</strong><span>See recent starts, stops, restores, and failures.</span>
          </button>
          <button class="tool-card" on:click={() => (diagnosticsOpen = !diagnosticsOpen)}>
            <strong>Technical details</strong><span>View CPU, memory, identities, and backend status.</span>
          </button>
          <button class="tool-card" disabled={busy === "support"} on:click={createSupportBundle}>
            <strong>{busy === "support" ? "Creating…" : "Create support bundle"}</strong><span>Generate a safe diagnostic package for troubleshooting.</span>
          </button>
        </section>

        {#if historyOpen}
          <section class="history-panel">
            <header><strong>Recent operations</strong></header>
            {#if history.length === 0}
              <div class="empty">No recorded operations.</div>
            {:else}
              {#each [...history].reverse().slice(0, 40) as item}
                <div class="history-row">
                  <time>{new Date(item.timestampUnixMs).toLocaleString()}</time>
                  <strong>{item.operation}</strong>
                  <span>{item.target ?? "—"}</span>
                  <b class:failed={item.outcome === "FAILED"}>{item.outcome}</b>
                </div>
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
      {/if}
    {/if}
  </main>

  {#if confirmReprovision}
    <div class="modal-backdrop" role="presentation" on:click={() => (confirmReprovision = undefined)}>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="reprovision-title" on:click|stopPropagation>
        <span class="eyebrow">ADVANCED RECOVERY</span>
        <h2 id="reprovision-title">Recreate {clientDisplayName(confirmReprovision as ClientStatus["id"])}?</h2>
        <p>This removes this virtual client's Windows and Minecraft sign-in state and creates it again from the prepared environment. Other clients are not changed.</p>
        <div class="modal-actions">
          <button class="secondary" on:click={() => (confirmReprovision = undefined)}>Cancel</button>
          <button class="danger" disabled={Boolean(busy)} on:click={reprovisionConfirmed}>Recreate client</button>
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  :global(*){box-sizing:border-box}
  :global(html){background:#080b0e}
  :global(body){margin:0;background:#080b0e;color:#eef1f4;font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  :global(button),:global(summary){font:inherit}
  :global(button:focus-visible),:global(summary:focus-visible){outline:2px solid #8e97ff;outline-offset:2px}
  .app-shell{min-height:100vh;display:grid;grid-template-columns:238px minmax(0,1fr)}
  .rail{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:20px 14px;border-right:1px solid #20262d;background:#0d1115}
  .brand{display:flex;align-items:center;gap:11px;padding:4px 8px 24px}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid #36404b;border-radius:9px;background:#141a20;font-size:11px;font-weight:800;letter-spacing:.07em}.brand>div:last-child{display:grid}.brand span{font-size:10px;color:#7b8793}
  nav{display:grid;gap:5px}.nav-item,.quiet{border:0;border-radius:9px;background:transparent;color:#87929d;padding:10px;text-align:left;cursor:pointer}.nav-item{display:grid;gap:2px}.nav-item>span{font-weight:700}.nav-item small{font-size:9px;color:#66727d}.nav-item:hover,.quiet:hover{background:#141a20;color:#dbe1e7}.nav-item.active{background:#171d24;color:#fff}.nav-item.active small{color:#8f9ba6}
  .rail-bottom{margin-top:auto;display:grid;gap:10px}.system-chip{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #20322a;border-radius:9px;background:#101713}.system-chip>span{width:7px;height:7px;border-radius:50%;background:#69d399}.system-chip>div{display:grid}.system-chip strong{font-size:10px}.system-chip small{font-size:9px;color:#75818d}.system-chip.attention{border-color:#443a25;background:#17140f}.system-chip.attention>span{background:#e5c56f}
  main{min-width:0;padding-bottom:64px}.topbar{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid #20262d;background:#0b0f13}.topbar h1{margin:3px 0 0;font-size:19px;line-height:1.2}.eyebrow,.client-kind{font-size:9px;font-weight:800;letter-spacing:.12em;color:#74808c}.ready-state{padding:5px 8px;border-radius:999px;background:#123123;color:#86e3ae;font-size:9px;font-weight:800}.ready-state.attention{background:#342b16;color:#e8c877}
  button{border:1px solid #303842;border-radius:7px;background:#151a20;color:#c6cdd5;padding:8px 11px;cursor:pointer}button:disabled{opacity:.35;cursor:not-allowed}.primary{background:#7f88ff;border-color:#9198ff;color:#090b0e;font-weight:750}.secondary{background:#11161b}.large{padding:10px 14px}.danger{background:#9f3541;border-color:#b54b57;color:#fff;font-weight:750}
  .error-banner,.notice{margin:18px 30px 0;padding:12px 14px;border:1px solid #57343a;border-radius:9px;background:#171013;display:flex;justify-content:space-between;gap:16px;align-items:center}.error-banner div,.notice>div{display:grid;gap:2px;font-size:11px}.error-banner span{color:#d1aeb2}.notice{border-color:#284b3b;background:#0f1814}.notice code{color:#9fd4b8;overflow-wrap:anywhere}
  .loading-panel{min-height:360px;display:grid;place-items:center;align-content:center;gap:13px;color:#8e99a4}.spinner{width:22px;height:22px;border:2px solid #2f3842;border-top-color:#8e97ff;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .hero{margin:34px 30px 0;max-width:760px}.hero.compact{margin-top:28px}.hero h2{margin:7px 0 8px;font-size:27px;letter-spacing:-.02em}.hero.compact h2{font-size:22px}.hero p{margin:0;color:#8e99a4;max-width:690px}
  .setup-focus{margin:24px 30px 0;min-height:170px;padding:22px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;border:1px solid #423925;border-radius:13px;background:#15130f}.step-number{width:46px;height:46px;display:grid;place-items:center;border:1px solid #3a424c;border-radius:12px;background:#0d1115;font-size:22px;font-weight:800}.setup-copy h2{margin:5px 0 7px;font-size:22px}.setup-copy p{margin:0;color:#959fa8;max-width:700px}.setup-action{display:grid;justify-items:end}.manual-note{max-width:190px;color:#9aa4ad;font-size:10px;text-align:right}
  .progress-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 30px}.progress-row article{display:flex;align-items:center;gap:10px;padding:13px;border:1px solid #202832;border-radius:10px;background:#0f1419}.progress-row article>span{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#242b32;color:#8995a0;font-size:10px;font-weight:800}.progress-row article.done>span{background:#173625;color:#82dfaa}.progress-row article>div{display:grid}.progress-row strong{font-size:11px}.progress-row small{font-size:9px;color:#75818d}
  .batch-bar{margin:22px 30px 0;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #202832;border-radius:11px;background:#0f1419}.batch-bar>div:first-child{display:grid;gap:2px}.batch-bar small{font-size:10px;color:#76828d}.batch-actions{display:flex;gap:6px}
  .client-list{display:grid;gap:8px;margin:10px 30px}.client-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto 170px;align-items:center;gap:14px;padding:13px 14px;border:1px solid #202832;border-radius:11px;background:#0d1217}.client-row.native{background:#10151b}.client-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #2c3540;border-radius:10px;background:#151b21;color:#aeb8c1;font-size:11px;font-weight:800}.client-main h3{margin:2px 0 1px;font-size:14px}.client-main small{color:#74818c;font-size:10px}.state{border-radius:999px;padding:4px 8px;background:#202831;color:#9ba7b2;font-size:9px;font-weight:800}.state.running{background:#123123;color:#86e3ae}.state.suspended{background:#322914;color:#e7ca7a}.state.error{background:#391820;color:#f4a0aa}.state.not_provisioned{background:#1c2229}.row-action{display:flex;justify-content:flex-end;align-items:center;gap:6px}.managed{font-size:9px;color:#74818c}
  .manage-menu{position:relative}.manage-menu summary{list-style:none;width:34px;height:34px;display:grid;place-items:center;border:1px solid #303842;border-radius:7px;background:#11161b;cursor:pointer}.manage-menu summary::-webkit-details-marker{display:none}.menu-panel{position:absolute;right:0;top:40px;z-index:10;width:210px;padding:6px;display:grid;gap:2px;border:1px solid #303842;border-radius:9px;background:#151a20;box-shadow:0 16px 45px rgba(0,0,0,.45)}.menu-panel button{border:0;background:transparent;text-align:left}.menu-panel button:hover:not(:disabled){background:#20272e}.menu-panel hr{width:100%;border:0;border-top:1px solid #293139}.menu-panel .danger-menu{color:#efa3aa}
  .support-callout{width:calc(100% - 60px);margin:8px 30px 0;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;border-color:#57343a;background:#171013;text-align:left}.support-callout>div{display:grid}.support-callout small{color:#b68d92}.support-callout>span{color:#d7a6ab;font-size:10px}
  .settings-card,.support-card,.history-panel,.diagnostics-panel{margin:14px 30px 0;border:1px solid #202832;border-radius:11px;background:#0d1217}.settings-card{padding:17px;display:flex;justify-content:space-between;gap:24px;align-items:center}.settings-card>div:first-child{display:grid;gap:3px}.settings-card h3,.support-card h3{margin:2px 0;font-size:15px}.settings-card p{margin:0;color:#808c97;font-size:11px}.setting-meta{display:grid;justify-items:end;gap:3px;color:#8995a0;font-size:10px}.badge{padding:5px 8px;border-radius:999px;background:#1a2229;color:#9eabb6;font-size:9px;font-weight:800}
  .support-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 30px 0}.support-summary article{display:grid;gap:2px;padding:13px;border:1px solid #202832;border-radius:10px;background:#0f1419}.support-summary span{font-size:9px;color:#75818d}.support-summary strong{font-size:14px}.support-card header{padding:15px;border-bottom:1px solid #202832}.issue-list{display:grid}.issue{display:flex;gap:12px;padding:10px 14px;border-top:1px solid #1c232a;font-size:10px}.issue:first-child{border-top:0}.issue b{width:50px;font-size:8px}.issue.blocker b{color:#ff9da6}.issue.warning b{color:#e9c477}.issue span{color:#a5afb8}.healthy-empty{display:grid;gap:3px;padding:22px 16px}.healthy-empty strong{color:#86dba9}.healthy-empty span{font-size:10px;color:#75818d}
  .support-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 30px}.tool-card{display:grid;gap:3px;padding:14px;text-align:left;background:#0f1419}.tool-card span{font-size:10px;color:#75818d}.history-panel header{padding:13px 15px}.history-row{display:grid;grid-template-columns:170px 160px 1fr 80px;gap:12px;padding:9px 15px;border-top:1px solid #1c232a;font-size:10px}.history-row time,.history-row span{color:#7f8b96}.history-row b{color:#86dba9}.history-row b.failed{color:#f0a1aa}.empty{padding:20px 15px;color:#74818c}.diagnostics-panel{display:grid}.diagnostics-panel>div{display:flex;justify-content:space-between;gap:20px;padding:10px 15px;border-top:1px solid #1c232a}.diagnostics-panel>div:first-child{border-top:0}.diagnostics-panel span{color:#75818d;font-size:10px}.diagnostics-panel strong{font-size:10px}
  .modal-backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:rgba(3,6,9,.72);backdrop-filter:blur(5px)}.modal{width:min(520px,100%);padding:22px;border:1px solid #433139;border-radius:13px;background:#11151a;box-shadow:0 22px 70px rgba(0,0,0,.45)}.modal h2{margin:6px 0 10px}.modal p{margin:0;color:#aab3bc}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}
  @media(max-width:1000px){.client-row{grid-template-columns:42px minmax(0,1fr) auto}.row-action{grid-column:2/-1;justify-content:flex-start}.progress-row,.support-summary{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:760px){.app-shell{grid-template-columns:1fr}.rail{position:static;height:auto;border-right:0;border-bottom:1px solid #20262d}.brand{padding-bottom:12px}.rail nav{display:grid;grid-template-columns:repeat(3,1fr)}.rail-bottom{display:none}.nav-item{text-align:center}.nav-item small{display:none}.topbar{padding:0 16px}.hero,.setup-focus,.progress-row,.batch-bar,.client-list,.settings-card,.support-summary,.support-card,.support-tools,.history-panel,.diagnostics-panel,.error-banner,.notice{margin-left:16px;margin-right:16px}.support-callout{width:calc(100% - 32px);margin-left:16px;margin-right:16px}.setup-focus{grid-template-columns:1fr}.step-number{display:none}.setup-action{justify-items:start}.manual-note{text-align:left;max-width:none}.progress-row,.support-summary,.support-tools{grid-template-columns:1fr}.batch-bar,.settings-card{align-items:flex-start;flex-direction:column}.setting-meta{justify-items:start}.client-row{grid-template-columns:42px 1fr}.client-row>.state{grid-column:2}.row-action{grid-column:2}.history-row{grid-template-columns:1fr 1fr}}
</style>
