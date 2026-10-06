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
  let historyOpen = false;

  $: clients = snapshot?.diagnostics.runtime.clients ?? [];
  $: native = clients.find((client) => client.native);
  $: virtuals = clients.filter((client) => !client.native);
  $: issues = snapshot?.doctor.issues ?? [];
  $: blockers = issues.filter((issue) => issue.severity === "BLOCKER");
  $: warnings = issues.filter((issue) => issue.severity === "WARNING");

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
      case "REPROVISION_VIRTUALS":
        return undefined;
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

    <nav>
      <button class="nav-item active">Overview</button>
      <button class="nav-item" on:click={() => (historyOpen = !historyOpen)}>History</button>
    </nav>

    <div class="rail-bottom">
      {#if policy}
        <div class="policy-note">
          <span>ENGINE POLICY</span>
          <strong>{policy.maxVirtualClients} Virtuals · {policy.virtualMemoryLimitMb / 1024} GB ceiling</strong>
          <small>{policy.virtualVcpus} vCPU each · Native version authority</small>
        </div>
      {/if}
      <button class="quiet" disabled={busy === "support"} on:click={createSupportBundle}>
        {busy === "support" ? "Creating…" : "Support bundle"}
      </button>
    </div>
  </aside>

  <main>
    <header class="topbar">
      <div>
        <span class="eyebrow">M-BEDROCK / VIRTUAL CLIENTS</span>
        <h1>Runtime Overview</h1>
      </div>

      <div class="top-actions">
        <div class="provider-state">
          <span class:online={Boolean(snapshot?.doctor.provider)}></span>
          {snapshot?.doctor.provider ?? "Provider unavailable"}
        </div>
        <button class="secondary" disabled={loading || Boolean(busy)} on:click={refresh}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
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
        <strong>Support bundle created</strong>
        <code>{supportPath}</code>
        <button on:click={() => (supportPath = "")}>Dismiss</button>
      </section>
    {/if}

    {#if loading && !snapshot}
      <section class="loading-panel">
        <div class="spinner"></div>
        <strong>Reading backend contract…</strong>
      </section>
    {:else if snapshot}
      <section class="setup-strip" class:ready={snapshot.doctor.nextSetupAction === "READY"}>
        <div>
          <span class="eyebrow">NEXT ENGINE ACTION</span>
          <strong>{actionLabel(snapshot.doctor.nextSetupAction)}</strong>
          <small>{setupHint(snapshot.doctor.nextSetupAction)}</small>
        </div>

        {#if primarySetupAction()}
          <button class="primary" disabled={Boolean(busy)} on:click={primarySetupAction()}>
            {busy === "setup" ? "Working…" : actionLabel(snapshot.doctor.nextSetupAction)}
          </button>
        {/if}
      </section>

      {#if update}
        <section class="update-strip">
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

      <section class="metrics">
        <article>
          <span>Host memory</span>
          <strong>{Math.round(snapshot.diagnostics.host.availableMemoryMb / 1024)} GB</strong>
          <small>available of {Math.round(snapshot.diagnostics.host.totalMemoryMb / 1024)} GB</small>
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

      {#if blockers.length || warnings.length}
        <section class="health">
          <header>
            <div>
              <span class="eyebrow">ENGINE HEALTH</span>
              <strong>{blockers.length} blocker{blockers.length === 1 ? "" : "s"} · {warnings.length} warning{warnings.length === 1 ? "" : "s"}</strong>
            </div>
          </header>
          <div class="issue-list">
            {#each issues as issue}
              <div class="issue {issue.severity.toLowerCase()}">
                <b>{issue.severity}</b>
                <span>{issueLabel(issue)}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <section class="clients">
        <header class="section-title">
          <div>
            <span class="eyebrow">CLIENTS</span>
            <h2>Native + Virtual runtime</h2>
          </div>
          <div class="batch-actions">
            {#if policy}
              {#each Array(policy.maxVirtualClients) as _, index}
                <button
                  class="secondary"
                  disabled={Boolean(busy)}
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
        </header>

        <div class="client-grid">
          {#if native}
            <article class="client-card native">
              <header>
                <div>
                  <span class="client-kind">VERSION AUTHORITY</span>
                  <h3>{native.id}</h3>
                </div>
                <span class="state running">{stateLabel(native.state)}</span>
              </header>
              <dl>
                <div><dt>Minecraft</dt><dd>{native.minecraftVersion ?? "Unknown"}</dd></div>
                <div><dt>Memory</dt><dd>Host managed</dd></div>
                <div><dt>Identity</dt><dd>Physical host</dd></div>
              </dl>
              <footer>
                <span>Lifecycle is managed manually on the host.</span>
              </footer>
            </article>
          {/if}

          {#each virtuals as client}
            {@const available = clientActions(client)}
            <article class="client-card">
              <header>
                <div>
                  <span class="client-kind">VIRTUAL MACHINE</span>
                  <h3>{client.id}</h3>
                </div>
                <span class="state {client.state.toLowerCase()}">{stateLabel(client.state)}</span>
              </header>

              <dl>
                <div><dt>Minecraft</dt><dd>{client.minecraftVersion ?? "—"}</dd></div>
                <div><dt>Working set</dt><dd>{client.hostWorkingSetMb != null ? `${client.hostWorkingSetMb} MB` : "—"}</dd></div>
                <div><dt>QA_READY</dt><dd>{client.readySnapshot === true ? "Available" : client.readySnapshot === false ? "Missing" : "Unknown"}</dd></div>
                <div><dt>VM identity</dt><dd>{client.vmIdentity ?? "—"}</dd></div>
                <div><dt>Windows identity</dt><dd>{client.windowsIdentity ?? "—"}</dd></div>
                <div><dt>Guest Agent</dt><dd>{client.guestAgentReady === true ? "Ready" : client.guestAgentReady === false ? "Unavailable" : "Unknown"}</dd></div>
              </dl>

              {#if available}
                <div class="client-actions">
                  <button
                    class="primary compact"
                    disabled={!available.open.allowed || Boolean(busy)}
                    title={blockerLabel(available.open.blocker)}
                    on:click={() => mutate(`open-${client.id}`, () => backend.open(client.id))}
                  >Open</button>
                  <button
                    class="secondary compact"
                    disabled={!available.restart.allowed || Boolean(busy)}
                    title={blockerLabel(available.restart.blocker)}
                    on:click={() => mutate(`restart-${client.id}`, () => backend.restart(client.id))}
                  >Restart</button>
                  <button
                    class="secondary compact"
                    disabled={!available.suspend.allowed || Boolean(busy)}
                    title={blockerLabel(available.suspend.blocker)}
                    on:click={() => mutate(`suspend-${client.id}`, () => backend.suspend(client.id))}
                  >Suspend</button>
                  <button
                    class="secondary compact"
                    disabled={!available.stop.allowed || Boolean(busy)}
                    title={blockerLabel(available.stop.blocker)}
                    on:click={() => mutate(`stop-${client.id}`, () => backend.stop(client.id))}
                  >Stop</button>
                  <button
                    class="secondary compact"
                    disabled={!available.setReady.allowed || Boolean(busy)}
                    title={blockerLabel(available.setReady.blocker)}
                    on:click={() => mutate(`ready-${client.id}`, () => backend.setReady(client.id))}
                  >Set ready</button>
                  <button
                    class="secondary compact"
                    disabled={!available.reset.allowed || Boolean(busy)}
                    title={blockerLabel(available.reset.blocker)}
                    on:click={() => mutate(`reset-${client.id}`, () => backend.reset(client.id))}
                  >Reset</button>
                  <button
                    class="secondary compact danger-soft"
                    disabled={!available.reprovision.allowed || Boolean(busy)}
                    title={blockerLabel(available.reprovision.blocker)}
                    on:click={() => (confirmReprovision = client.id)}
                  >Reprovision</button>
                </div>
              {/if}
            </article>
          {/each}
        </div>
      </section>

      {#if historyOpen}
        <section class="history-panel">
          <header class="section-title">
            <div>
              <span class="eyebrow">OPERATION JOURNAL</span>
              <h2>Recent engine operations</h2>
            </div>
            <button class="secondary" on:click={() => (historyOpen = false)}>Close</button>
          </header>
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
  :global(button:focus-visible){outline:2px solid #8e97ff;outline-offset:2px}
  .app-shell{min-height:100vh;display:grid;grid-template-columns:232px minmax(0,1fr)}
  .rail{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:20px 14px;border-right:1px solid #20262d;background:#0d1115}
  .brand{display:flex;align-items:center;gap:11px;padding:4px 8px 23px}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid #36404b;border-radius:9px;background:#141a20;font-size:11px;font-weight:800;letter-spacing:.07em}.brand>div:last-child{display:grid}.brand span{font-size:10px;color:#7b8793}
  nav{display:grid;gap:4px}.nav-item,.quiet{border:0;border-radius:8px;background:transparent;color:#87929d;padding:9px 10px;text-align:left;cursor:pointer}.nav-item:hover,.quiet:hover{background:#141a20;color:#dbe1e7}.nav-item.active{background:#171d24;color:#fff}
  .rail-bottom{margin-top:auto;display:grid;gap:12px}.policy-note{display:grid;gap:4px;padding:12px;border:1px solid #202832;border-radius:9px;background:#10151a}.policy-note span,.eyebrow,.client-kind{font-size:9px;font-weight:800;letter-spacing:.12em;color:#74808c}.policy-note strong{font-size:11px}.policy-note small{font-size:10px;color:#75818c}
  main{min-width:0;padding-bottom:70px}.topbar{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid #20262d;background:#0b0f13}.topbar h1,.section-title h2{margin:3px 0 0;font-size:19px;line-height:1.2}.top-actions{display:flex;align-items:center;gap:10px}.provider-state{display:flex;align-items:center;gap:7px;color:#87929d;font-size:11px}.provider-state>span{width:7px;height:7px;border-radius:50%;background:#59616a}.provider-state>span.online{background:#6ed6a0;box-shadow:0 0 0 3px #173126}
  button{border:1px solid #303842;border-radius:7px;background:#151a20;color:#c6cdd5;padding:8px 11px;cursor:pointer}button:disabled{opacity:.35;cursor:not-allowed}.primary{background:#7f88ff;border-color:#9198ff;color:#090b0e;font-weight:750}.secondary{background:#11161b}.compact{padding:6px 8px;font-size:11px}.danger-soft{color:#f0a8ae}.danger{background:#9f3541;border-color:#b54b57;color:#fff;font-weight:750}
  .error-banner,.notice{margin:18px 30px 0;padding:12px 14px;border:1px solid #57343a;border-radius:9px;background:#171013;display:flex;justify-content:space-between;gap:16px;align-items:center}.error-banner div,.notice{font-size:11px}.error-banner div{display:grid}.error-banner span{color:#d1aeb2}.notice{border-color:#284b3b;background:#0f1814}.notice code{color:#9fd4b8;overflow-wrap:anywhere}
  .loading-panel{min-height:300px;display:grid;place-items:center;align-content:center;gap:13px;color:#8e99a4}.spinner{width:22px;height:22px;border:2px solid #2f3842;border-top-color:#8e97ff;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .setup-strip,.update-strip{margin:22px 30px 0;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px;border:1px solid #3f3827;border-radius:11px;background:#16140f}.setup-strip.ready{border-color:#263d32;background:#101713}.setup-strip>div,.update-strip>div{display:grid;gap:3px}.setup-strip strong,.update-strip strong{font-size:16px}.setup-strip small,.update-strip small{color:#8c959d}.update-strip{margin-top:10px;border-color:#253444;background:#0f151c}.staged{font-size:10px;font-weight:800;color:#9fc8e8}
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 30px}.metrics article{display:grid;gap:2px;padding:14px;border:1px solid #202832;border-radius:10px;background:#0f1419}.metrics span,.metrics small{font-size:10px;color:#75818d}.metrics strong{font-size:18px}
  .health,.clients,.history-panel{margin:14px 30px 0;border:1px solid #202832;border-radius:11px;background:#0d1217}.health header{padding:14px 16px;border-bottom:1px solid #202832}.health header>div{display:grid;gap:3px}.issue-list{display:flex;flex-wrap:wrap;gap:7px;padding:12px}.issue{display:flex;gap:7px;align-items:center;padding:6px 8px;border-radius:7px;background:#141a20;font-size:10px}.issue b{font-size:8px}.issue.blocker b{color:#ff9da6}.issue.warning b{color:#e9c477}.issue span{color:#a5afb8;text-transform:capitalize}
  .section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px}.batch-actions{display:flex;gap:6px}
  .client-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;border-top:1px solid #202832;background:#202832}.client-card{min-width:0;padding:16px;background:#0d1217}.client-card.native{background:#10151b}.client-card>header{display:flex;justify-content:space-between;gap:10px}.client-card h3{margin:3px 0 0;font-size:16px}.state{height:max-content;border-radius:999px;padding:3px 7px;background:#202831;color:#9ba7b2;font-size:9px;font-weight:800}.state.running{background:#123123;color:#86e3ae}.state.suspended{background:#322914;color:#e7ca7a}.state.error{background:#391820;color:#f4a0aa}.state.not_provisioned{background:#1c2229}
  dl{margin:18px 0 0;display:grid;gap:8px}dl div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #1b2229;padding-bottom:7px}dt,dd{margin:0;font-size:10px}dt{color:#71808d}dd{color:#c3cbd3;text-align:right;overflow:hidden;text-overflow:ellipsis}.client-card footer{margin-top:18px;color:#717e89;font-size:10px}.client-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:15px}
  .history-panel{overflow:hidden}.history-list{display:grid}.modal-backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:rgba(3,6,9,.72);backdrop-filter:blur(5px)}.modal{width:min(520px,100%);padding:22px;border:1px solid #433139;border-radius:13px;background:#11151a;box-shadow:0 22px 70px rgba(0,0,0,.45)}.modal h2{margin:6px 0 10px}.modal p{margin:0;color:#aab3bc}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}.history-list{display:grid}.history-row{display:grid;grid-template-columns:160px 150px 1fr 80px 130px;gap:12px;padding:9px 16px;border-top:1px solid #1c232a;align-items:center;font-size:10px}.history-row time,.history-row span{color:#7f8b96}.history-row b{color:#86dba9}.history-row b.failed{color:#f0a1aa}.history-row code{color:#b3bdc6}.empty{padding:24px 16px;color:#74818c}
  @media(max-width:1100px){.client-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metrics{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:760px){.app-shell{grid-template-columns:1fr}.rail{position:static;height:auto;border-right:0;border-bottom:1px solid #20262d}.rail nav,.rail-bottom{display:none}.topbar{padding:0 16px}.provider-state{display:none}.setup-strip,.update-strip,.metrics,.health,.clients,.history-panel,.error-banner,.notice{margin-left:16px;margin-right:16px}.client-grid,.metrics{grid-template-columns:1fr}.section-title{align-items:flex-start;flex-direction:column}.batch-actions{flex-wrap:wrap}.history-row{grid-template-columns:1fr 1fr}.history-row code{grid-column:1/-1}}
</style>
