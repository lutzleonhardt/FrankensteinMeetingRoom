import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MODULE_LOADER } from './app.config';
import { MeetingService } from './meeting.service';
import { PanelHeader } from './panel-header';

@Component({
  selector: 'app-whiteboard-slot',
  imports: [PanelHeader],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './whiteboard-slot.html',
  styleUrl: './whiteboard-slot.css',
})
export class WhiteboardSlot {
  private readonly loader = inject(MODULE_LOADER);
  private readonly service = inject(MeetingService);

  readonly remoteReady = signal(false);
  readonly hasMeeting = computed(() => this.service.currentMeeting() !== null);
  // Standalone URL is the same origin as the remoteEntry — pulled from the
  // orchestrator's remote-info repo after the bundle loads. Stays null on load
  // failure, which hides the icon (no link to a remote we couldn't reach).
  readonly standaloneUrl = signal<string | null>(null);

  constructor() {
    this.loader
      .loadRemoteModule('whiteboard', './Bootstrap')
      .then(() => {
        this.remoteReady.set(true);
        const info = this.loader.adapters.remoteInfoRepo.tryGet('whiteboard').get();
        if (info?.scopeUrl) this.standaloneUrl.set(info.scopeUrl);
      })
      .catch((err) => console.error('[shell] whiteboard remote failed to load', err));
  }
}
