import { mount } from 'svelte';
import MermaidEditor from './MermaidEditor.svelte';

// Wrapped in `$state` so the textarea's `bind:value={sourceState.value}`
// mutation is observed by `MermaidEditor`'s `$effect`. A plain object is
// not a reactive proxy — edits would update the textarea but the SVG
// re-render effect would never re-run. T10's Custom Element wrapper uses
// the same pattern (also `.svelte.ts` for the same reason).
const sourceState = $state({ value: 'sequenceDiagram\n  Alice->>Bob: Hi' });

mount(MermaidEditor, {
  target: document.getElementById('root')!,
  props: {
    sourceState,
    onChange: (source: string) =>
      console.log('[standalone] diagram:changed', { mermaidSource: source }),
  },
});
