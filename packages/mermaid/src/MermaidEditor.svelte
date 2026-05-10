<script lang="ts">
  import mermaid from 'mermaid';
  import { onMount } from 'svelte';
  import { debounce } from './debounce';

  type Props = { sourceState: { value: string }; onChange: (s: string) => void };
  let { sourceState, onChange }: Props = $props();

  let svg = $state('');
  let renderError = $state<string | null>(null);
  const debouncedEmit = debounce((s: string) => onChange(s), 500);

  onMount(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  });

  $effect(() => {
    const s = sourceState.value;
    let cancelled = false;
    (async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, s);
        if (!cancelled) { svg = rendered; renderError = null; }
      } catch (err) {
        if (!cancelled) renderError = (err as Error).message;
      }
    })();
    return () => { cancelled = true; };
  });
</script>

<div class="editor">
  <textarea
    bind:value={sourceState.value}
    oninput={(e) => debouncedEmit((e.target as HTMLTextAreaElement).value)}
    aria-label="Mermaid source"></textarea>
  <div class="preview">
    {#if renderError}<pre class="error">{renderError}</pre>{:else}{@html svg}{/if}
  </div>
</div>

<style>
  .editor { display: grid; grid-template-columns: 2fr 3fr; grid-template-rows: 1fr; gap: 8px; height: 100%; }
  textarea { width: 100%; height: 100%; font-family: monospace; resize: none; box-sizing: border-box; }
  .preview { overflow: auto; padding: 8px; }
  .error { color: #b00020; white-space: pre-wrap; }
</style>
