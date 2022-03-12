import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import {
  PublicInputObjectDto,
  PublicOutputObjectDto,
} from './dtos/input-output-dto';
import { REPLEnvironmentDescriptorDto } from './dtos/repl-dto';
import { PseudoTerminalComponent } from './pseudo-terminal/pseudo-terminal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(private httpClient: HttpClient) {}

  @ViewChild(PseudoTerminalComponent) pseudoTerminal?: PseudoTerminalComponent;

  ngAfterViewInit(): void {
    this.pseudoTerminal?.prompt('In[0]:= ');
    this.httpClient
      .post<REPLEnvironmentDescriptorDto>('http://localhost:3000/session', {})
      .subscribe((dto) => {
        console.log({ dto });
        if (typeof dto.topicId === 'string' && dto.topicId.length > 0) {
          const input: PublicInputObjectDto = new PublicInputObjectDto(
            dto.topicId,
            '1+1',
            dto.initialSeqNum
          );
          this.httpClient
            .post<PublicOutputObjectDto>(
              'http://localhost:3000/evaluate',
              input
            )
            .subscribe((ouput) => {
              console.log({ ouput });
            });
        }
      });
  }

  handleTerminalFlush(inputContent: string): void {
    console.log({ inputContent });
  }
}
