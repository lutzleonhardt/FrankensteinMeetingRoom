import type { Meeting } from './types';
import { architectureReviewExcalidraw } from './seed-architecture-review.excalidraw';
import { sprintRetroExcalidraw } from './seed-sprint-retro.excalidraw';
import { designSyncExcalidraw } from './seed-design-sync.excalidraw';

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
    excalidrawData: architectureReviewExcalidraw,
    excalidrawUpdatedAt: archStart,
    mermaidSource:
      'sequenceDiagram\n  Calendar->>MeetingService: selectMeeting(id)\n  MeetingService-->>Bus: event:selected\n  Bus-->>Whiteboard: render\n  Bus-->>Mermaid: render',
    mermaidUpdatedAt: archStart,
    updatedAt: archStart,
  },
  {
    id: 'meeting-sprint-retro',
    title: 'Sprint Retro',
    start: retroStart,
    end: weekday(2, 15),
    attendees: ['Lutz', 'Yara', 'Pia'],
    excalidrawData: sprintRetroExcalidraw,
    excalidrawUpdatedAt: retroStart,
    mermaidSource:
      'flowchart LR\n  Sprint([Sprint 42]) --> WW[Went Well]\n  Sprint --> NW[Needs Work]\n  Sprint --> Ideas[Ideas]\n  WW --> AI{{Action Items}}\n  NW --> AI\n  Ideas --> AI\n  AI --> Owners[Assign Owners]',
    mermaidUpdatedAt: retroStart,
    updatedAt: retroStart,
  },
  {
    id: 'meeting-design-sync',
    title: 'Design Sync',
    start: designStart,
    end: weekday(3, 10, 30),
    attendees: ['Manfred', 'Pia'],
    excalidrawData: designSyncExcalidraw,
    excalidrawUpdatedAt: designStart,
    mermaidSource:
      'flowchart LR\n  Home([Home]) --> Browse[Browse]\n  Browse --> Detail[Detail View]\n  Detail --> Cart{Add to Cart?}\n  Cart -->|Yes| Checkout[Checkout]\n  Cart -->|No| Browse\n  Checkout --> Confirm([Confirmation])',
    mermaidUpdatedAt: designStart,
    updatedAt: designStart,
  },
];
