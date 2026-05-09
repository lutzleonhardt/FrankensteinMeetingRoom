import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { emit, on, type BusEvents } from '@frankenstein/shared/bus';
import { seed } from '@frankenstein/shared/seed';
import type { Meeting, ExcalidrawDemoData } from '@frankenstein/shared/types';

const STORAGE_KEY = 'frankenstein:meetings';

@Injectable({ providedIn: 'root' })
export class MeetingService implements OnDestroy {
  // Source of truth: the meetings array and the selected id. currentMeeting is
  // derived — keeps the two from drifting when applyDrawingChange mutates the array.
  // Writable signals are private so consumers can't bypass selectMeeting / the bus.
  private readonly _meetings = signal<Meeting[]>([]);
  private readonly _currentMeetingId = signal<string | null>(null);

  readonly meetings = this._meetings.asReadonly();
  readonly currentMeeting = computed<Meeting | null>(() => this.findMeeting(this._currentMeetingId()));

  // Stash off() returns for symmetry with the bus-log pattern; the root service
  // never unmounts in practice but the shape is what M3/M4 remotes will mirror.
  private readonly unsubscribers: Array<() => void> = [];

  constructor() {
    const hadStorage = localStorage.getItem(STORAGE_KEY) !== null;
    this._meetings.set(this.loadAll());
    // Persist on first boot so a session that only clicks (never fires drawing/diagram)
    // still leaves the seed in LocalStorage — required by Task 6 Acceptance #2.
    if (!hadStorage) this.persistAll();
    this.unsubscribers.push(
      on('drawing:changed', (p) => this.applyDrawingChange(p)),
      on('diagram:changed', (p) => this.applyDiagramChange(p)),
      on('context:request', () => this.rebroadcastCurrent()),
    );
  }

  ngOnDestroy(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
  }

  selectMeeting(id: string): void {
    const meeting = this.findMeeting(id);
    this._currentMeetingId.set(meeting?.id ?? null);
    if (meeting) {
      emit('event:selected', { meetingId: meeting.id, initialData: meeting });
    }
  }

  private findMeeting(id: string | null): Meeting | null {
    if (id === null) return null;
    return this._meetings().find((m) => m.id === id) ?? null;
  }

  private applyDrawingChange(p: BusEvents['drawing:changed']): void {
    if (p.meetingId !== this._currentMeetingId()) return;
    const now = new Date().toISOString();
    const data = structuredClone(p.excalidrawData) as ExcalidrawDemoData;
    this.updateMeeting(p.meetingId, (m) => ({
      ...m,
      excalidrawData: data,
      excalidrawUpdatedAt: now,
      updatedAt: now,
    }));
  }

  private applyDiagramChange(p: BusEvents['diagram:changed']): void {
    if (p.meetingId !== this._currentMeetingId()) return;
    const now = new Date().toISOString();
    this.updateMeeting(p.meetingId, (m) => ({
      ...m,
      mermaidSource: p.mermaidSource,
      mermaidUpdatedAt: now,
      updatedAt: now,
    }));
  }

  private updateMeeting(id: string, mut: (m: Meeting) => Meeting): void {
    const next = this._meetings().map((m) => (m.id === id ? mut(m) : m));
    this._meetings.set(next);
    this.persistAll();
  }

  private rebroadcastCurrent(): void {
    const m = this.currentMeeting();
    if (m) emit('event:selected', { meetingId: m.id, initialData: m });
  }

  private loadAll(): Meeting[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Meeting[]) : seed;
  }

  private persistAll(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._meetings()));
  }
}
