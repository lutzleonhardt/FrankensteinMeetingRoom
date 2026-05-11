import { Component, computed, inject } from '@angular/core';
import { MeetingService } from './meeting.service';
import { PanelHeader } from './panel-header';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

type ArtifactStatus = 'saved' | 'none';

@Component({
  selector: 'app-meeting-details',
  imports: [PanelHeader],
  templateUrl: './meeting-details.html',
  styleUrl: './meeting-details.css',
})
export class MeetingDetails {
  private readonly svc = inject(MeetingService);

  readonly meeting = this.svc.currentMeeting;

  readonly formattedRange = computed(() => {
    const m = this.meeting();
    if (!m) return '';
    return `${dateFormat.format(new Date(m.start))} – ${dateFormat.format(new Date(m.end))}`;
  });

  readonly attendeeList = computed(() => this.meeting()?.attendees.join(', ') ?? '');

  readonly excalidrawStatus = computed<ArtifactStatus>(() =>
    this.meeting()?.excalidrawUpdatedAt ? 'saved' : 'none',
  );
  readonly excalidrawTimestamp = computed(() => {
    const ts = this.meeting()?.excalidrawUpdatedAt;
    return ts ? timeFormat.format(new Date(ts)) : null;
  });

  readonly mermaidStatus = computed<ArtifactStatus>(() =>
    this.meeting()?.mermaidUpdatedAt ? 'saved' : 'none',
  );
  readonly mermaidTimestamp = computed(() => {
    const ts = this.meeting()?.mermaidUpdatedAt;
    return ts ? timeFormat.format(new Date(ts)) : null;
  });
}
