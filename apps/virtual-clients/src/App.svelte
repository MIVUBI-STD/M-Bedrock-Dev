<script lang="ts">
  import { onMount } from "svelte";
  import { backend, desktop, BackendBridgeError } from "./app/bridge/virtualClientsApi.js";
  import AppSidebar from "./app/components/AppSidebar.svelte";
  import ErrorBanner from "./app/components/ErrorBanner.svelte";
  import ClientsSurface from "./app/surfaces/ClientsSurface.svelte";
  import SettingsSurface from "./app/surfaces/SettingsSurface.svelte";
  import SetupSurface from "./app/surfaces/SetupSurface.svelte";
  import SupportSurface from "./app/surfaces/SupportSurface.svelte";
  import RecreateClientDialog from "./app/components/RecreateClientDialog.svelte";
  import RestoreRecoveryPointDialog from "./app/components/RestoreRecoveryPointDialog.svelte";
  import { operationProgressLabel, type ProgressObserver } from "./app/operationProgress.js";
  import { settleMutation } from "./app/mutation.js";
  import SaveRecoveryPointDialog from "./app/components/SaveRecoveryPointDialog.svelte";
  import type {
    BasePreparationReport,
    ClientLifecycleActions,
    ClientStatus,
    EnginePolicy,
    EngineSnapshot,
    OperationRecord,
    UpdateCheck,
  } from "./contracts.js";
  import { actionForClient, clientDisplayName, primaryClientAction } from "./view-model.js";
  import type { Page } from "./app/navigation.js";
  import { presentRuntimeError, type RuntimeErrorPresentation } from "./app/runtimeErrorPresentation.js";
  import { setupExperience } from "./app/setupFlow.js";


  let snapshot: EngineSnapshot | undefined;
  let policy: EnginePolicy | undefined;
  let basePreflight: BasePreparationReport | undefined;
  let actions: readonly ClientLifecycleActions[] = [];
  let history: readonly OperationRecord[] = [];
  let update: UpdateCheck | undefined;
  let confirmReprovision: ClientStatus["id"] | undefined;
  let confirmReset: ClientStatus["id"] | undefined;
  let refreshFailed = false;
  let refreshRunning = false;
  let confirmSetReady: ClientStatus["id"] | undefined;
  let loading = true;
  let busy = "";
  let operationStatus = "";
  let disposed = false;
  const reportProgress: ProgressObserver = (progress) => {
    if (!disposed) operationStatus = operationProgressLabel(progress);
  };
  let error: RuntimeErrorPresentation | undefined;
  let supportPath = "";
  let arrangeMessage = "";
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
  $: setupComplete = snapshot?.doctor.nextSetupAction === "READY";

  async function loadHistory() {
    try {
      history = await backend.history();
    } catch (value) {
      error = presentRuntimeError(value);
    }
  }

  function selectPage(next: Page) {
    pageChosen = true;
    page = next;
    if (next === "clients" && !busy && !loading) void refresh();
    if (next === "support" && !busy && !loading) void loadHistory();
  }

  async function loadState() {
    loading = true;
    try {
      const [nextSnapshot, nextPolicy, nextActions] = await Promise.all([
        backend.snapshot(),
        policy ? Promise.resolve(policy) : backend.policy(),
        backend.actions(),
      ]);
      const nextBasePreflight =
        setupExperience(nextSnapshot.doctor.nextSetupAction).phase === "ENVIRONMENT"
          ? await backend.basePreflight()
          : undefined;

      snapshot = nextSnapshot;
      policy = nextPolicy;
      basePreflight = nextBasePreflight;
      actions = nextActions;

      if (!pageChosen) page = nextSnapshot.doctor.nextSetupAction === "READY" ? "clients" : "setup";
      if (page === "setup" && nextSnapshot.doctor.nextSetupAction === "READY" && pageChosen) page = "clients";
    } catch (value) {
      snapshot = undefined;
      basePreflight = undefined;
      policy = undefined;
      actions = [];
      throw value;
    } finally {
      loading = false;
    }
  }

  async function refresh() {
    if (busy || refreshRunning) return;
    refreshRunning = true;
    error = undefined;
    refreshFailed = false;
    try {
      await loadState();
    } catch (value) {
      refreshFailed = true;
      error = presentRuntimeError(value);
    } finally {
      refreshRunning = false;
    }
  }

  async function checkUpdateOnce() {
    try {
      update = await backend.checkUpdate();
    } catch {
      update = undefined;
    }
  }

  async function stageApplicationUpdate() {
    if (busy || loading || refreshRunning) return;
    operationStatus = "Waiting for backend confirmation…";
    busy = "stage-update";
    error = undefined;
    try {
      await backend.stageUpdate(reportProgress);
      operationStatus = "Checking update state…";
      update = await backend.checkUpdate();
    } catch (value) {
      error = presentRuntimeError(value);
    } finally {
      busy = "";
      operationStatus = "";
    }
  }

  async function mutate(label: string, operation: (onProgress: ProgressObserver) => Promise<unknown>) {
    if (busy || loading) return;
    busy = label;
    operationStatus = "Waiting for backend confirmation…";
    error = undefined;
    refreshFailed = false;
    try {
      const result = await settleMutation(
        () => operation(reportProgress),
        async () => {
          operationStatus = "Refreshing current client state…";
          await loadState();
        },
      );
      refreshFailed = !result.refresh.ok;
      if (!result.operation.ok) {
        error = presentRuntimeError(result.operation.error);
      } else if (!result.refresh.ok) {
        error = presentRuntimeError(result.refresh.error);
      }
    } finally {
      busy = "";
      operationStatus = "";
    }
  }

  function clientActions(client: ClientStatus) {
    return actionForClient(actions, client.id);
  }

  async function continueSetup() {
    const action = snapshot?.doctor.nextSetupAction;
    if (!action) return;
    if (action === "REGISTER_BASE") return mutate("setup", backend.registerBase);
    if (action === "PROVISION_VIRTUALS") return mutate("setup", backend.provision);
    await refresh();
  }

  async function runPrimaryClientAction(client: ClientStatus, available: ClientLifecycleActions) {
    const primary = primaryClientAction(available, client.state);
    if (!primary) return;
    if (primary.kind === "start-setup") return mutate(`setup-${client.id}`, (onProgress) => backend.startSetup(client.id, onProgress));
    if (primary.kind === "open") return mutate(`open-${client.id}`, (onProgress) => backend.open(client.id, onProgress));
    return mutate(`start-${client.id}`, (onProgress) => backend.startClient(client.id, onProgress));
  }

  async function startAll() {
    if (!policy) return;
    const count = policy.maxVirtualClients;
    await mutate("start-all", (onProgress) => backend.start(count, onProgress));
  }

  async function openBaseFinalization() {
    await mutate("open-base-finalization", backend.openBaseFinalization);
  }

  async function openBaseLocation() {
    error = undefined;
    try {
      await desktop.openBaseLocation();
    } catch (value) {
      error = presentRuntimeError(value);
    }
  }

  async function openSetupTools() {
    error = undefined;
    try {
      await desktop.openSetupTools();
    } catch (value) {
      error = presentRuntimeError(value);
    }
  }

  async function arrangeWindows() {
    if (busy || loading || refreshRunning) return;
    operationStatus = "Waiting for backend confirmation…";
    busy = "arrange";
    error = undefined;
    arrangeMessage = "";
    try {
      for (const client of virtuals) {
        const available = clientActions(client);
        if (client.state === "RUNNING" && available?.open.allowed) await backend.open(client.id, reportProgress);
      }
      operationStatus = "Arranging client windows…";
      const result = await desktop.arrangeWindows();
      if (result.arranged.length === 0) {
        throw new BackendBridgeError("WINDOWS_NOT_FOUND", "No Minecraft client windows are currently open.", true);
      }
      const missingNative = result.missing.includes("Native");
      arrangeMessage = `${result.arranged.length} window${result.arranged.length === 1 ? "" : "s"} arranged${missingNative ? " · This PC was not open" : ""}`;
    } catch (value) {
      error = presentRuntimeError(value);
    } finally {
      busy = "";
      operationStatus = "";
    }
  }

  async function createSupportBundle() {
    if (busy || loading || refreshRunning) return;
    operationStatus = "Waiting for backend confirmation…";
    busy = "support";
    error = undefined;
    try {
      const result = await backend.supportBundle(reportProgress);
      supportPath = result.path;
      operationStatus = "Reading operation history…";
      history = await backend.history();
    } catch (value) {
      error = presentRuntimeError(value);
    } finally {
      busy = "";
      operationStatus = "";
    }
  }

  async function setReadyConfirmed() {
    const client = confirmSetReady;
    if (!client || client === "Native") return;
    confirmSetReady = undefined;
    await mutate(`ready-${client}`, (onProgress) => backend.setReady(client, onProgress));
  }

  async function resetConfirmed() {
    const client = confirmReset;
    if (!client || client === "Native" || busy || loading) return;
    confirmReset = undefined;
    await mutate(`reset-${client}`, (onProgress) => backend.reset(client, onProgress));
  }

  async function reprovisionConfirmed() {
    const client = confirmReprovision;
    if (!client || client === "Native") return;
    confirmReprovision = undefined;
    await mutate(`reprovision-${client}`, (onProgress) => backend.reprovision(client, onProgress));
  }

  onMount(() => {
    void refresh();
    void checkUpdateOnce();
    // Reconcile external VMware changes when the operator returns. Avoid
    // continuous polling of heavyweight diagnostics or duplicate requests.
    const refreshVisibleClients = () => {
      if (page === "clients" && !document.hidden && !busy && !loading) void refresh();
    };
    window.addEventListener("focus", refreshVisibleClients);
    document.addEventListener("visibilitychange", refreshVisibleClients);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refreshVisibleClients);
      document.removeEventListener("visibilitychange", refreshVisibleClients);
    };
  });
</script>

<div class="app-shell">
  <AppSidebar
    {page}
    {setupComplete}
    {runningVirtuals}
    {readyVirtuals}
    blockerCount={blockers.length}
    provider={snapshot?.doctor.provider}
    setupAction={snapshot?.doctor.nextSetupAction}
    {loading}
    {busy}
    onSelect={selectPage}
    onRefresh={refresh}
  />

  <main>
    <header class="topbar">
      <div>
        <span class="eyebrow">M-BEDROCK / VIRTUAL CLIENTS</span>
        <h1>{page === "setup" ? "Setup" : page === "clients" ? "Clients" : page === "settings" ? "Settings" : "Help & Support"}</h1>
      </div>
      {#if snapshot}
        <div class="ready-state" class:attention={!setupComplete || blockers.length > 0}>
          {setupComplete && blockers.length === 0 ? "Setup complete" : blockers.length ? "Needs attention" : "Setup required"}
        </div>
      {/if}
    </header>

    {#if busy}
      <section class="notice" role="status" aria-live="polite">
        <div>
          <strong>Operation in progress</strong>
          <span>{operationStatus || "Working…"}</span>
        </div>
      </section>
    {/if}

    {#if error}
      <ErrorBanner
        {error}
        onRetry={refresh}
        onSupport={() => selectPage("support")}
      />
    {/if}

    {#if refreshFailed}
      <section class="notice" role="status">
        <div>
          <strong>Current client state could not be refreshed</strong>
          <span>Client controls are hidden until Refresh succeeds. The operation error, if any, is shown above.</span>
        </div>
      </section>
    {/if}

    {#if arrangeMessage}
      <section class="notice" aria-live="polite">
        <div><strong>Windows arranged</strong><span>{arrangeMessage}</span></div>
        <button on:click={() => (arrangeMessage = "")}>Dismiss</button>
      </section>
    {/if}

    {#if supportPath}
      <section class="notice" aria-live="polite">
        <div><strong>Support bundle created</strong><code>{supportPath}</code></div>
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
        <SetupSurface
          {snapshot}
          {basePreflight}
          {virtuals}
          {readyVirtuals}
          {busy}
          onContinue={continueSetup}
          onOpenClients={() => selectPage("clients")}
          onSupport={() => selectPage("support")}
          onOpenBaseLocation={openBaseLocation}
          onOpenSetupTools={openSetupTools}
          onOpenBaseFinalization={openBaseFinalization}
        />
      {:else if page === "clients"}
        <ClientsSurface
          {snapshot}
          {policy}
          {actions}
          {native}
          {virtuals}
          blockerCount={blockers.length}
          setupAction={snapshot.doctor.nextSetupAction}
          {runningVirtuals}
          {busy}
          onStartAll={startAll}
          onArrange={arrangeWindows}
          onStopAll={() => mutate("stop-all", (onProgress) => backend.stop(undefined, onProgress))}
          onPrimary={runPrimaryClientAction}
          onRestart={(client) => mutate(`restart-${client}`, (onProgress) => backend.restart(client, onProgress))}
          onSuspend={(client) => mutate(`suspend-${client}`, (onProgress) => backend.suspend(client, onProgress))}
          onStop={(client) => mutate(`stop-${client}`, (onProgress) => backend.stop(client, onProgress))}
          onSetReady={(client) => { confirmSetReady = client; }}
          onReset={(client) => { confirmReset = client; }}
          onReprovision={(client) => { confirmReprovision = client; }}
          onSupport={() => selectPage("support")}
          onVerifyIdentities={() => mutate("verify-identities", backend.verifyIdentities)}
        />
      {:else if page === "settings"}
        <SettingsSurface
          {snapshot}
          {policy}
          {update}
          {busy}
          onStageUpdate={stageApplicationUpdate}
        />
      {:else}
        <SupportSurface
          {snapshot}
          {issues}
          {blockers}
          {warnings}
          {history}
          {busy}
          onCreateSupportBundle={createSupportBundle}
        />
      {/if}
    {/if}
  </main>

  {#if confirmSetReady}
    <SaveRecoveryPointDialog
      clientName={clientDisplayName(confirmSetReady)}
      {busy}
      onCancel={() => (confirmSetReady = undefined)}
      onConfirm={setReadyConfirmed}
    />
  {/if}

  {#if confirmReset}
    <RestoreRecoveryPointDialog
      clientName={clientDisplayName(confirmReset)}
      {busy}
      onCancel={() => (confirmReset = undefined)}
      onConfirm={resetConfirmed}
    />
  {/if}

  {#if confirmReprovision}
    <RecreateClientDialog
      clientName={clientDisplayName(confirmReprovision)}
      {busy}
      onCancel={() => (confirmReprovision = undefined)}
      onConfirm={reprovisionConfirmed}
    />
  {/if}
</div>
