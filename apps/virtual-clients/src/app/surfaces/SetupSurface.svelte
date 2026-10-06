<script lang="ts">
  import type { ClientStatus, EngineSnapshot } from "../../contracts.js";
  import { actionLabel, setupHint } from "../../view-model.js";

  export let snapshot: EngineSnapshot;
  export let virtuals: ClientStatus[];
  export let readyVirtuals: number;
  export let busy: string;
  export let onContinue: () => void | Promise<void>;
  export let onOpenClients: () => void;

  $: action = snapshot.doctor.nextSetupAction;
  $: directAction = ["REGISTER_BASE", "PROVISION_VIRTUALS", "VERIFY_IDENTITIES"].includes(action);
  $: clientAction = action === "CREATE_READY_SNAPSHOTS" || action === "REPROVISION_VIRTUALS";
</script>

<section class="hero">
  <span class="eyebrow">FIRST-TIME SETUP</span>
  <h2>Get your virtual Minecraft clients ready</h2>
  <p>Follow one step at a time. Technical setup details stay in the background unless something needs attention.</p>
</section>

<section class="setup-focus">
  <div class="step-number">→</div>
  <div class="setup-copy">
    <span class="eyebrow">CURRENT STEP</span>
    <h2>{actionLabel(action)}</h2>
    <p>{setupHint(action)}</p>
  </div>
  <div class="setup-action">
    {#if directAction}
      <button class="primary large" disabled={Boolean(busy)} on:click={onContinue}>
        {busy === "setup" ? "Working…" : "Continue"}
      </button>
    {:else if clientAction}
      <button class="primary large" on:click={onOpenClients}>Continue with clients</button>
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
