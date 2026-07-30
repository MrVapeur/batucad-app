import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'flex flex-col items-center gap-4 p-3 h-screen'
  }
})
export class App {
  protected readonly title = signal('batucad-app');
}
