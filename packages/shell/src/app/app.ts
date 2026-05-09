import { Component } from '@angular/core';
import { Calendar } from './calendar';
import { BusLog } from './bus-log';
import { MeetingDetails } from './meeting-details';

@Component({
  selector: 'app-root',
  imports: [Calendar, BusLog, MeetingDetails],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
