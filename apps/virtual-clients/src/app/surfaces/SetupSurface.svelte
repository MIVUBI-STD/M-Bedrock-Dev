<script lang="ts">
  import type { BasePreparationReport, ClientStatus, EngineSnapshot } from "../../contracts.js";
  import { setupExperience, setupPhaseIndex } from "../setupFlow.js";

  export let snapshot: EngineSnapshot;
  export let basePreflight: BasePreparationReport | undefined;
  export let virtuals: ClientStatus[];
  export let readyVirtuals: number;
  export let busy: string;
  export let onContinue: () => void | Promise<void>;
  export let onOpenClients: () => void;
  export let onSupport: () => void;
  export let onOpenBaseLocation: () => void | Promise<void>;
  export let onOpenSetupTools: () => void | Promise<void>;
  export let onOpenBaseFinalization: () => void | Promise<void>;

  $: action = snapshot.doctor.nextSetupAction;
  $: experience = setupExperience(action);
  $: phaseIndex = setupPhaseIndex(action);
</script>

<section class="hero setup-intro">
  <span class="eyebrow">SETUP · STEP {Math.min(phaseIndex + 1, 4)} OF 4</span>
  <h2>Set up your virtual clients</h2>
  <p>Follow one step at a time. Virtual Clients checks each result before continuing.</p>
</section>

<section class="setup-focus">
  <div class="step-number">{experience.owner === "APP" ? "→" : experience.owner === "BLOCKED" ? "!" : "•"}</div>
  <div class="setup-copy">
    <span class="eyebrow">{experience.owner === "BLOCKED" ? "NEEDS ATTENTION" : "CURRENT STEP"}</span>
    <h2>{experience.title}</h2>
    <p>{experience.description}</p>
    {#if experience.steps.length}
      <ol class="setup-instructions">
        {#each experience.steps as step}<li>{step}</li>{/each}
      </ol>
    {/if}
  </div>
  <div class="setup-action">
    {#if experience.owner === "APP" && action !== "READY"}
      <button class="primary large" disabled={Boolean(busy)} on:click={onContinue}>
        {busy === "setup" ? "Working…" : experience.primaryLabel}
      </button>
    {:else if experience.owner === "CLIENTS" || action === "READY"}
      <button class="primary large" on:click={onOpenClients}>{action === "READY" ? "Finish setup" : experience.primaryLabel}</button>
    {:else if experience.owner === "BLOCKED"}
      <button class="secondary large" on:click={onSupport}>{experience.primaryLabel}</button>
    {:else}
      {#if action === "FINALIZE_BASE"}
        <button class="primary large" disabled={Boolean(busy)} on:click={onOpenBaseFinalization}>
          {busy === "open-base-finalization" ? "Opening…" : "Open environment"}
        </button>
      {/if}
      <button class="secondary large" disabled={Boolean(busy)} on:click={onContinue}>{experience.primaryLabel}</button>
      <small class="manual-note">Virtual Clients will check the result before moving to the next step.</small>
    {/if}
  </div>
</section>

<section class="progress-row">
  {#each ["Computer", "Environment", "Virtual clients", "Accounts"] as label, index}
    <article class:done={index < phaseIndex} class:current={index === phaseIndex}>
      <span>{index < phaseIndex ? "✓" : index + 1}</span>
      <div>
        <strong>{label}</strong>
        <small>{index < phaseIndex ? "Complete" : index === phaseIndex ? "Current" : "Next"}</small>
      </div>
    </article>
  {/each}
</section>

{#if action === "CREATE_READY_SNAPSHOTS"}
  <section class="setup-summary-line">
    <strong>{readyVirtuals} of {virtuals.length || 3} recovery points saved</strong>
  </section>
{/if}


{#if experience.phase === "ENVIRONMENT" && basePreflight}
  <section class="base-preflight">
    <header>
      <div>
        <span class="eyebrow">ENVIRONMENT PREFLIGHT</span>
        <strong>What Virtual Clients can verify from this PC</strong>
      </div>
    </header>
    <div class="preflight-grid">
      <div><span>VMware</span><strong>{basePreflight.provider ?? "Not detected"}</strong></div>
      <div><span>Minecraft Education</span><strong>{basePreflight.nativeVersion ?? "Not detected"}</strong></div>
      <div><span>Prepared environment</span><strong>{basePreflight.basePresent ? "Found" : "Not found"}</strong></div>
      <div><span>Environment state</span><strong>{basePreflight.baseStopped === true ? "Stopped" : basePreflight.baseStopped === false ? "Running" : "Unknown"}</strong></div>
      <div><span>CPU</span><strong>{basePreflight.configuredVcpus ?? "—"} vCPU</strong></div>
      <div><span>Memory</span><strong>{basePreflight.configuredMemoryMb ? `${basePreflight.configuredMemoryMb} MB` : "—"}</strong></div>
      <div><span>3D acceleration</span><strong>{basePreflight.graphics3dEnabled === true ? "Enabled" : basePreflight.graphics3dEnabled === false ? "Disabled" : "Unknown"}</strong></div>
      <div><span>Network</span><strong>{basePreflight.networkPresent === true ? "Present" : basePreflight.networkPresent === false ? "Missing" : "Unknown"}</strong></div>
      <div><span>Network mode</span><strong>{basePreflight.networkConnectionType ?? "Unknown"}</strong></div>
    </div>
    {#if basePreflight.baseExpectedPath}
      <div class="preflight-tools">
        <button class="secondary" on:click={onOpenBaseLocation}>Open environment location</button>
        <button class="secondary" on:click={onOpenSetupTools}>Open setup tools</button>
      </div>
      <details class="preflight-path">
        <summary>Expected environment location</summary>
        <code>{basePreflight.baseExpectedPath}</code>
      </details>
    {/if}
  </section>
{/if}
