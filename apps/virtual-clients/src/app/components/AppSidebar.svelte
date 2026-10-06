<script lang="ts">
  import type { Page } from "../navigation.js";

  export let page: Page;
  export let runningVirtuals: number;
  export let blockerCount: number;
  export let loading: boolean;
  export let busy: string;
  export let onSelect: (page: Page) => void;
  export let onRefresh: () => void | Promise<void>;
</script>

<aside class="rail">
  <div class="brand">
    <div class="brand-mark">MB</div>
    <div><strong>Virtual Clients</strong><span>Multi-client manager</span></div>
  </div>

  <nav aria-label="Virtual Clients navigation">
    <button class:active={page === "clients"} class="nav-item" on:click={() => onSelect("clients")}>
      <span>Clients</span><small>{runningVirtuals ? `${runningVirtuals} running` : "Manage virtual clients"}</small>
    </button>
    <button class:active={page === "settings"} class="nav-item" on:click={() => onSelect("settings")}>
      <span>Settings</span><small>Performance & updates</small>
    </button>
    <button class:active={page === "support"} class="nav-item" on:click={() => onSelect("support")}>
      <span>Help</span><small>{blockerCount ? `${blockerCount} need attention` : "Support & diagnostics"}</small>
    </button>
  </nav>

  <div class="rail-bottom">
    <button class="quiet" disabled={loading || Boolean(busy)} on:click={onRefresh}>
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  </div>
</aside>
