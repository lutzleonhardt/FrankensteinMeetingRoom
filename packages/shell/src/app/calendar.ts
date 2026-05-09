import 'temporal-polyfill/global';

import { Component, inject } from '@angular/core';
import { CalendarComponent } from '@schedule-x/angular';
import { createCalendar, createViewWeek } from '@schedule-x/calendar';
import type { Meeting } from '@frankenstein/shared/types';
import { MeetingService } from './meeting.service';

const tz = Temporal.Now.timeZoneId();

const toSx = (m: Meeting) => ({
  id: m.id,
  title: m.title,
  start: Temporal.Instant.from(m.start).toZonedDateTimeISO(tz),
  end: Temporal.Instant.from(m.end).toZonedDateTimeISO(tz),
});

@Component({
  selector: 'app-calendar',
  imports: [CalendarComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly meetingService = inject(MeetingService);

  readonly calendarApp = createCalendar({
    views: [createViewWeek()],
    events: this.meetingService.meetings().map(toSx),
    selectedDate: Temporal.Now.plainDateISO(),
    callbacks: {
      onEventClick: (e) => {
        this.meetingService.selectMeeting(e.id as string);
      },
    },
  });
}
