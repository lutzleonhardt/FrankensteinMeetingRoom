import { Component } from '@angular/core';
import { Calendar } from './calendar';
import { BusLog } from './bus-log';
import { MeetingDetails } from './meeting-details';
import { WhiteboardSlot } from './whiteboard-slot';
import { MermaidSlot } from './mermaid-slot';

@Component({
  selector: 'app-root',
  imports: [Calendar, BusLog, MeetingDetails, WhiteboardSlot, MermaidSlot],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
