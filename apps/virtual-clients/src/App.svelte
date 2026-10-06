<script lang="ts">
  import { onMount } from "svelte";
  import { backend, desktop, BackendBridgeError } from "./app/bridge/virtualClientsApi.js";
  import AppSidebar from "./app/components/AppSidebar.svelte";
  import ClientsSurface from "./app/surfaces/ClientsSurface.svelte";
  import SettingsSurface from "./app/surfaces/SettingsSurface.svelte";
  import SetupSurface from "./app/surfaces/SetupSurface.svelte";
  import SupportSurface from "./app/surfaces/SupportSurface.svelte";
  import RecreateClientDialog from "./app/components/RecreateClientDialog.svelte";
  import type {
    ClientLifecycleActions,
    ClientStatus,
    EnginePolicy,
    EngineSnapshot,
    OperationRecord,
    UpdateCheck,
  } from "./contracts.js";
  import { actionForClient, clientDisplayName, primaryClientAction } from "./view-model.js";
  import type { Page } from "./app/navigation.js";


  let snapshot: EngineSnapshot | undefined;
  let policy: EnginePolicy | undefined;
  let actions: readonly ClientLifecycleActions[] = [];
  let history: readonly OperationRecord[] = [];
  let update: UpdateCheck | undefined;
  let confirmReprovision: ClientStatus["id"] | undefined;
  let loading = true;
  let busy = "";
  let error = "";
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

      if (!pageChosen) page = nextSnapshot.doctor.nextSetupAction === "READY" ? "clients" : "setup";
      if (page === "setup" && nextSnapshot.doctor.nextSetupAction === "READY" && pageChosen) page = "clients";
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

  function clientActions(client: ClientStatus) {
    return actionForClient(actions, client.id);
  }

  async function continueSetup() {
    const action = snapshot?.doctor.nextSetupAction;
    if (!action) return;
    if (action === "REGISTER_BASE") return mutate("setup", backend.registerBase);
    if (action === "PROVISION_VIRTUALS") return mutate("setup", backend.provision);
    if (action === "VERIFY_IDENTITIES") return mutate("setup", backend.verifyIdentities);
  }

  async function runPrimaryClientAction(client: ClientStatus, available: ClientLifecycleActions) {
    const primary = primaryClientAction(available);
    if (!primary) return;
    if (primary.kind === "open") return mutate(`open-${client.id}`, () => backend.open(client.id));
    return mutate(`start-${client.id}`, () => backend.start(Number(client.id.slice(-2))));
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
        if (client.state === "RUNNING" && available?.open.allowed) await backend.open(client.id);
      }
      const result = await desktop.arrangeWindows();
      if (result.arranged.length === 0) {
        throw new BackendBridgeError("WINDOWS_NOT_FOUND", "No Minecraft client windows are currently open.", true);
      }
      const missingNative = result.missing.includes("Native");
      arrangeMessage = `${result.arranged.length} window${result.arranged.length === 1 ? "" : "s"} arranged${missingNative ? " · This PC was not open" : ""}`;
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

  async function reprovisionConfirmed() {
    const client = confirmReprovision;
    if (!client || client === "Native") return;
    confirmReprovision = undefined;
    await mutate(`reprovision-${client}`, () => backend.reprovision(client));
  }

  onMount(() => void refresh());
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
          {setupComplete && blockers.length === 0 ? "Ready" : blockers.length ? "Needs attention" : "Setup required"}
        </div>
      {/if}
    </header>

    {#if error}
      <section class="error-banner" aria-live="polite">
        <div><strong>Virtual Clients could not connect</strong><span>{error}</span></div>
        <button on:click={refresh}>Try again</button>
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
          {virtuals}
          {readyVirtuals}
          {busy}
          onContinue={continueSetup}
          onOpenClients={() => selectPage("clients")}
        />
      {:else if page === "clients"}
        <ClientsSurface
          {snapshot}
          {policy}
          {actions}
          {native}
          {virtuals}
          blockerCount={blockers.length}
          {runningVirtuals}
          {busy}
          onStartAll={startAll}
          onArrange={arrangeWindows}
          onStopAll={() => mutate("stop-all", () => backend.stop())}
          onPrimary={runPrimaryClientAction}
          onRestart={(client) => mutate(`restart-${client}`, () => backend.restart(client))}
          onSuspend={(client) => mutate(`suspend-${client}`, () => backend.suspend(client))}
          onStop={(client) => mutate(`stop-${client}`, () => backend.stop(client))}
          onSetReady={(client) => mutate(`ready-${client}`, () => backend.setReady(client))}
          onReset={(client) => mutate(`reset-${client}`, () => backend.reset(client))}
          onReprovision={(client) => (confirmReprovision = client)}
          onSupport={() => selectPage("support")}
        />
      {:else if page === "settings"}
        <SettingsSurface
          {snapshot}
          {policy}
          {update}
          {busy}
          onStageUpdate={() => mutate("stage-update", backend.stageUpdate)}
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

  {#if confirmReprovision}
    <RecreateClientDialog
      clientName={clientDisplayName(confirmReprovision)}
      {busy}
      onCancel={() => (confirmReprovision = undefined)}
      onConfirm={reprovisionConfirmed}
    />
  {/if}
</div>
