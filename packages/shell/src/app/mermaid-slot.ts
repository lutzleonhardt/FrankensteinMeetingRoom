import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MODULE_LOADER } from './app.config';
import { MeetingService } from './meeting.service';

@Component({
  selector: 'app-mermaid-slot',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './mermaid-slot.html',
  styleUrl: './mermaid-slot.css',
})
export class MermaidSlot {
  private readonly loader = inject(MODULE_LOADER);
  private readonly service = inject(MeetingService);

  readonly remoteReady = signal(false);
  readonly hasMeeting = computed(() => this.service.currentMeeting() !== null);

  constructor() {
    this.loader
      .loadRemoteModule('mermaid', './Bootstrap')
      .then(() => this.remoteReady.set(true))
      .catch((err) => console.error('[shell] mermaid remote failed to load', err));
  }
}
