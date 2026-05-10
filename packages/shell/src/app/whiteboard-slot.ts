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
  selector: 'app-whiteboard-slot',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './whiteboard-slot.html',
  styleUrl: './whiteboard-slot.css',
})
export class WhiteboardSlot {
  private readonly loader = inject(MODULE_LOADER);
  private readonly service = inject(MeetingService);

  readonly remoteReady = signal(false);
  readonly hasMeeting = computed(() => this.service.currentMeeting() !== null);

  constructor() {
    this.loader
      .loadRemoteModule('whiteboard', './Bootstrap')
      .then(() => this.remoteReady.set(true))
      .catch((err) => console.error('[shell] whiteboard remote failed to load', err));
  }
}
