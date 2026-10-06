<script lang="ts">
  import { actionLabel } from "../../view-model.js";
  import type { SetupAction } from "../../contracts.js";
  import type { Page } from "../navigation.js";

  export let page: Page;
  export let setupComplete: boolean;
  export let runningVirtuals: number;
  export let readyVirtuals: number;
  export let blockerCount: number;
  export let provider: string | null | undefined;
  export let setupAction: SetupAction | undefined;
  export let loading: boolean;
  export let busy: string;
  export let onSelect: (page: Page) => void;
  export let onRefresh: () => void | Promise<void>;
</script>

<aside class="rail">
  <div class="brand">
    <div class="brand-mark">MB</div>
    <div><strong>Virtual Clients</strong><span>M-Bedrock</span></div>
  </div>

  <nav aria-label="Virtual Clients navigation">
    {#if !setupComplete}
      <button class:active={page === "setup"} class="nav-item" on:click={() => onSelect("setup")}>
        <span>Setup</span><small>{actionLabel(setupAction ?? "PREPARE_BASE")}</small>
      </button>
    {/if}
    <button class:active={page === "clients"} class="nav-item" on:click={() => onSelect("clients")}>
      <span>Clients</span><small>{runningVirtuals} running · {readyVirtuals} ready</small>
    </button>
    <button class:active={page === "settings"} class="nav-item" on:click={() => onSelect("settings")}>
      <span>Settings</span><small>App & performance</small>
    </button>
    <button class:active={page === "support"} class="nav-item" on:click={() => onSelect("support")}>
      <span>Help & Support</span><small>{blockerCount ? `${blockerCount} need attention` : "System status"}</small>
    </button>
  </nav>

  <div class="rail-bottom">
    <div class="system-chip" class:attention={!setupComplete || blockerCount > 0}>
      <span></span>
      <div>
        <strong>{setupComplete && blockerCount === 0 ? "System ready" : "Attention needed"}</strong>
        <small>{provider ?? "Virtualization unavailable"}</small>
      </div>
    </div>
    <button class="quiet" disabled={loading || Boolean(busy)} on:click={onRefresh}>
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  </div>
</aside>
