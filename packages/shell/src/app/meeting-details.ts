import { Component, computed, inject } from '@angular/core';
import { MeetingService } from './meeting.service';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-meeting-details',
  imports: [],
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
}
