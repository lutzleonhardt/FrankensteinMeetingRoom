import 'temporal-polyfill/global';

import { Component } from '@angular/core';
import { CalendarComponent } from '@schedule-x/angular';
import { createCalendar, createViewWeek } from '@schedule-x/calendar';
import { emit } from '@frankenstein/shared/bus';
import { seed } from '@frankenstein/shared/seed';
import type { Meeting } from '@frankenstein/shared/types';

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
  readonly calendarApp = createCalendar({
    views: [createViewWeek()],
    events: seed.map(toSx),
    selectedDate: Temporal.Now.plainDateISO(),
    callbacks: {
      onEventClick: (e) => {
        const m = seed.find((x) => x.id === (e.id as string));
        if (!m) return;
        // TODO Task 6: route through MeetingService
        emit('event:selected', { meetingId: m.id, initialData: m });
      },
    },
  });
}
