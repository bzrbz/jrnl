<script>
  let { onclose } = $props()
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cómo funciona jrnl">
    <h2>jrnl</h2>
    <p class="modal-sub">un bullet journal que vive en tu navegador</p>

    <dl class="modal-list">
      <div><dt><code>. tarea</code></dt><dd>crea una tarea</dd></div>
      <div><dt><code>- nota</code></dt><dd>crea una nota</dd></div>
      <div><dt><code>o evento</code></dt><dd>crea un evento</dd></div>
    </dl>

    <hr />

    <dl class="modal-list">
      <div><dt>← →</dt><dd>navegar entre días</dd></div>
      <div><dt>desliza →</dt><dd>completar tarea</dd></div>
      <div><dt>desliza ←</dt><dd>borrar</dd></div>
      <div><dt>⠿ mantén</dt><dd>reordenar</dd></div>
    </dl>

    <p class="modal-note">tus datos se quedan en este dispositivo.<br>sin cuenta, sin servidor.</p>

    <button class="modal-close" onclick={onclose}>entendido</button>
  </div>
</div>
