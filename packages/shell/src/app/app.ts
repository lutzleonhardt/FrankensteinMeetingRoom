import { Component } from '@angular/core';
import { Calendar } from './calendar';
import { BusLog } from './bus-log';

@Component({
  selector: 'app-root',
  imports: [Calendar, BusLog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
