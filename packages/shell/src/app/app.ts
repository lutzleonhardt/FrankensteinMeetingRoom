import { Component } from '@angular/core';
import { Calendar } from './calendar';

@Component({
  selector: 'app-root',
  imports: [Calendar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
