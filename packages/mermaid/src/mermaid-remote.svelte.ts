import { mount, unmount } from 'svelte';
import { on, emit } from '@frankenstein/shared/bus';
import MermaidEditor from './MermaidEditor.svelte';

// Light DOM (no Shadow DOM). Mermaid renders SVG and queries the DOM via
// document.getElementById to find its rendering host — Shadow DOM cuts those
// queries off. We mount directly into `this`.
//
// `.svelte.ts` filename is mandatory: $state outside .svelte files is only
// processed by the Svelte compiler in .svelte.ts / .svelte.js files (T9
// established this for standalone-main.svelte.ts; same rule applies here).
export class MermaidRemote extends HTMLElement {
  private app?: ReturnType<typeof mount>;
  private unsubs: Array<() => void> = [];
  private meetingId: string | null = null;
  // External $state container shared with MermaidEditor as its `sourceState`
  // prop. Mutating .value reactively re-renders the editor without an
  // unmount/mount cycle when a different meeting is selected.
  private sourceState = $state({ value: '' });

  connectedCallback() {
    // Inject the editor's CSS sidecar once per document. The federate build
    // copies `Bootstrap-<hash>.css` to a stable `mermaid-editor.css` so we
    // can resolve it via `import.meta.url` even though the JS/CSS hashes
    // differ. Same shape as packages/whiteboard's excalidraw.css <link>.
    const cssHref = new URL('./mermaid-editor.css', import.meta.url).href;
    if (!document.querySelector(`link[data-mermaid-remote-css][href="${cssHref}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      link.dataset.mermaidRemoteCss = '';
      document.head.appendChild(link);
    }

    this.unsubs.push(
      on('event:selected', (p) => {
        this.meetingId = p.meetingId;
        this.sourceState.value = p.initialData.mermaidSource ?? '';
      }),
    );
    this.app = mount(MermaidEditor, {
      target: this,
      props: {
        sourceState: this.sourceState,
        onChange: (source: string) => {
          if (!this.meetingId) return;
          emit('diagram:changed', { meetingId: this.meetingId, mermaidSource: source });
        },
      },
    });
    // Ask the host to (re)broadcast the current selection so we hydrate even
    // if `event:selected` was emitted before this remote loaded.
    emit('context:request', {});
  }

  disconnectedCallback() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    if (this.app) {
      unmount(this.app);
      this.app = undefined;
    }
  }
}
