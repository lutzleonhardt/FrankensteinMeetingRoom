import 'temporal-polyfill/global';

import { Component, effect, inject } from '@angular/core';
import { CalendarComponent } from '@schedule-x/angular';
import { createCalendar, createViewWeek } from '@schedule-x/calendar';
import type { Meeting } from '@frankenstein/shared/types';
import { MeetingService } from './meeting.service';
import { PanelHeader } from './panel-header';

const tz = Temporal.Now.timeZoneId();

const DEFAULT_CALENDAR = 'default';
const SELECTED_CALENDAR = 'selected';

const toSx = (m: Meeting) => ({
  id: m.id,
  title: m.title,
  start: Temporal.Instant.from(m.start).toZonedDateTimeISO(tz),
  end: Temporal.Instant.from(m.end).toZonedDateTimeISO(tz),
  calendarId: DEFAULT_CALENDAR,
});

@Component({
  selector: 'app-calendar',
  imports: [CalendarComponent, PanelHeader],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly meetingService = inject(MeetingService);

  readonly calendarApp = createCalendar({
    views: [createViewWeek()],
    calendars: {
      [DEFAULT_CALENDAR]: {
        colorName: DEFAULT_CALENDAR,
        lightColors: { main: '#1c7df9', container: '#d2e7ff', onContainer: '#0d3a73' },
        darkColors: { main: '#c0dcff', container: '#2c5a8f', onContainer: '#dbe7f5' },
      },
      [SELECTED_CALENDAR]: {
        colorName: SELECTED_CALENDAR,
        lightColors: { main: '#f97316', container: '#ffd9b8', onContainer: '#7a3a0a' },
        darkColors: { main: '#ffba8a', container: '#a85a1e', onContainer: '#ffe6d2' },
      },
    },
    events: this.meetingService.meetings().map(toSx),
    selectedDate: Temporal.Now.plainDateISO(),
    callbacks: {
      onEventClick: (e) => {
        this.meetingService.selectMeeting(e.id as string);
      },
    },
  });

  constructor() {
    effect(() => {
      const activeId = this.meetingService.currentMeeting()?.id ?? null;
      for (const event of this.calendarApp.events.getAll()) {
        const want = event.id === activeId ? SELECTED_CALENDAR : DEFAULT_CALENDAR;
        if (event.calendarId !== want) {
          this.calendarApp.events.update({ ...event, calendarId: want });
        }
      }
    });
  }
}
