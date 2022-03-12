import { Component, ViewChild } from '@angular/core';
import { PseudoTerminalComponent } from './pseudo-terminal/pseudo-terminal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild(PseudoTerminalComponent) pseudoTerminal?: PseudoTerminalComponent;

  ngAfterViewInit(): void {
    this.pseudoTerminal?.prompt('Hello');
    this.pseudoTerminal?.prompt('Hello, World');
  }
}
