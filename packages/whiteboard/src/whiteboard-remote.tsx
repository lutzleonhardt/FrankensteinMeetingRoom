import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { on, emit } from '@frankenstein/shared/bus';
import type { ExcalidrawDemoData } from '@frankenstein/shared/types';
import { App } from './App';

const CSS_HREF = new URL('./excalidraw.css', import.meta.url).href;

// Firefox caps <canvas> at ~11180px per side. If Excalidraw mounts before
// its stylesheet applies, the container is unconstrained and the first
// canvas allocation overshoots that limit (setTransform throws). Load the
// CSS eagerly at module init and gate the first render on it. Idempotent
// across remounts via the link's load state.
const cssReady: Promise<void> = (() => {
  const existing = document.querySelector(
    `link[data-whiteboard-css="${CSS_HREF}"]`,
  ) as HTMLLinkElement | null;
  if (existing) {
    if ((existing.sheet as CSSStyleSheet | null) !== null) return Promise.resolve();
    return new Promise<void>((resolve) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
    });
  }
  return new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.dataset.whiteboardCss = CSS_HREF;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.appendChild(link);
  });
})();

export class WhiteboardRemote extends HTMLElement {
  private root?: Root;
  private unsubs: Array<() => void> = [];
  private meetingId: string | null = null;
  private initialData: ExcalidrawDemoData | null = null;

  connectedCallback() {
    this.root = createRoot(this);

    this.unsubs.push(
      on('event:selected', (p) => {
        this.meetingId = p.meetingId;
        this.initialData = p.initialData.excalidrawData
          ? structuredClone(p.initialData.excalidrawData) as ExcalidrawDemoData
          : null;
        this.render();
      }),
    );

    emit('context:request', {});
  }

  disconnectedCallback() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.root?.unmount();
    this.root = undefined;
  }

  private render() {
    const root = this.root;
    if (!root) return;
    cssReady.then(() => {
      if (this.root !== root) return;
      root.render(
        createElement(App, {
          initialData: this.initialData,
          onChange: (data) => {
            if (!this.meetingId) return;
            emit('drawing:changed', { meetingId: this.meetingId, excalidrawData: data });
          },
        }),
      );
    });
  }
}
