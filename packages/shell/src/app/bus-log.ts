import { Component, OnDestroy, signal } from '@angular/core';
import { ALL_BUS_EVENTS, on, type BusEventName } from '@frankenstein/shared/bus';

type BusLogEntry = {
  name: BusEventName;
  payload: unknown;
  at: string;
};

const MAX_ENTRIES = 10;
const PAYLOAD_PREVIEW_MAX = 80;

@Component({
  selector: 'app-bus-log',
  imports: [],
  templateUrl: './bus-log.html',
  styleUrl: './bus-log.css',
})
export class BusLog implements OnDestroy {
  readonly entries = signal<BusLogEntry[]>([]);

  // Listener handles are kept so we can unsubscribe symmetrically. The host root never
  // unmounts, so this is defensive — but it sets the pattern that M3/M4 remotes will
  // mirror in their Custom Element disconnectedCallback.
  private readonly unsubscribers: Array<() => void> = [];

  constructor() {
    for (const name of ALL_BUS_EVENTS) {
      this.unsubscribers.push(
        on(name, (payload) => this.append(name, payload)),
      );
    }
  }

  ngOnDestroy(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
  }

  preview(payload: unknown): string {
    const s = JSON.stringify(payload) ?? 'undefined';
    return s.length > PAYLOAD_PREVIEW_MAX
      ? s.slice(0, PAYLOAD_PREVIEW_MAX) + '…'
      : s;
  }

  private append(name: BusEventName, payload: unknown): void {
    const entry: BusLogEntry = {
      name,
      payload,
      at: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };
    this.entries.update((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
  }
}
