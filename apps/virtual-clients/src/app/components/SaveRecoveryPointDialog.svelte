<script lang="ts">
  export let clientName: string;
  export let busy: string;
  export let onCancel: () => void;
  export let onConfirm: () => void | Promise<void>;

  let confirmed = false;
</script>

<div class="modal-backdrop">
  <dialog open class="modal" aria-labelledby="save-ready-title">
    <span class="eyebrow">RECOVERY POINT</span>
    <h2 id="save-ready-title">Save a recovery point for {clientName}?</h2>
    <p>Before saving, confirm you signed in to Minecraft Education and saw the main menu before stopping this client. Virtual Clients does not read or store account credentials; this confirmation only protects the recovery point.</p>
    <label class="confirmation-check">
      <input type="checkbox" bind:checked={confirmed} />
      <strong>I confirmed the signed-in Minecraft Education main menu on this client.</strong>
    </label>
    <div class="modal-actions">
      <button class="secondary" on:click={onCancel}>Cancel</button>
      <button class="primary" disabled={!confirmed || Boolean(busy)} on:click={onConfirm}>Save recovery point</button>
    </div>
  </dialog>
</div>
