import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { on, emit } from '@frankenstein/shared/bus';
import type { ExcalidrawDemoData } from '@frankenstein/shared/types';
import { App } from './App';

const CSS_HREF = new URL('./excalidraw.css', import.meta.url).href;
function ensureExcalidrawCss() {
  if (document.querySelector(`link[data-whiteboard-css="${CSS_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  link.dataset.whiteboardCss = CSS_HREF;
  document.head.appendChild(link);
}

export class WhiteboardRemote extends HTMLElement {
  private root?: Root;
  private unsubs: Array<() => void> = [];
  private meetingId: string | null = null;
  private initialData: ExcalidrawDemoData | null = null;

  connectedCallback() {
    ensureExcalidrawCss();
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
    this.root?.render(
      createElement(App, {
        initialData: this.initialData,
        onChange: (data) => {
          if (!this.meetingId) return;
          emit('drawing:changed', { meetingId: this.meetingId, excalidrawData: data });
        },
      }),
    );
  }
}
