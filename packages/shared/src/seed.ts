import type { Meeting } from './types';

function weekday(offset: number, hour: number, minute = 0): string {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const target = new Date(monday);
  target.setDate(monday.getDate() + offset);
  target.setHours(hour, minute, 0, 0);
  return target.toISOString();
}

const archStart = weekday(1, 10);
const retroStart = weekday(2, 14);
const designStart = weekday(3, 9, 30);

export const seed: Meeting[] = [
  {
    id: 'meeting-architecture-review',
    title: 'Architecture Review',
    start: archStart,
    end: weekday(1, 11, 30),
    attendees: ['Lutz', 'Manfred', 'Yara'],
    mermaidSource:
      'sequenceDiagram\n  Calendar->>MeetingService: selectMeeting(id)\n  MeetingService-->>Bus: event:selected\n  Bus-->>Whiteboard: render\n  Bus-->>Mermaid: render',
    updatedAt: archStart,
  },
  {
    id: 'meeting-sprint-retro',
    title: 'Sprint Retro',
    start: retroStart,
    end: weekday(2, 15),
    attendees: ['Lutz', 'Yara', 'Pia'],
    updatedAt: retroStart,
  },
  {
    id: 'meeting-design-sync',
    title: 'Design Sync',
    start: designStart,
    end: weekday(3, 10, 30),
    attendees: ['Manfred', 'Pia'],
    updatedAt: designStart,
  },
];
