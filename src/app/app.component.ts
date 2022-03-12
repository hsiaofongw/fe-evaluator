import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import {
  PublicInputObjectDto,
  PublicOutputObjectDto,
} from './dtos/input-output-dto';
import { REPLEnvironmentDescriptorDto } from './dtos/repl-dto';
import { EvaluateSessionFormComponent } from './evaluate-session-form/evaluate-session-form.component';
import { EvaluateService, Evaluator } from './evaluate.service';
import { PseudoTerminalComponent } from './pseudo-terminal/pseudo-terminal.component';
import { format } from 'date-fns';

type KeyValuePair = [string, string];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  evaluators: Evaluator[] = [];
  isCreationWindowVisible = false;
  isCreationWindowValid = false;
  keyValuePairs: KeyValuePair[] = [];

  @ViewChild(PseudoTerminalComponent) pseudoTerminal?: PseudoTerminalComponent;
  @ViewChild(EvaluateSessionFormComponent) evaluateSessionFormComponent?: EvaluateSessionFormComponent;

  constructor(private evaluateService: EvaluateService) {}

  ngAfterViewInit(): void {
    this.pseudoTerminal?.prompt('In[0]:= ');

    const defaultEvaluator = new Evaluator('http://localhost:3000', this.evaluateService, '默认会话');
    defaultEvaluator.initialize().subscribe();
    this.evaluators.push(defaultEvaluator);
  }

  handleTerminalFlush(inputContent: string): void {
    console.log({ inputContent });
  }

  handleMouseEnterOpt(opt: string): void {
    console.log({ opt });
  }

  handleWindowCreateButtonClick(): void {
    this.isCreationWindowVisible = true;
  }

  handleWindowCancel(): void {
    this.isCreationWindowVisible = false;
  }

  handleWindowOk(): void {
    const config = this.evaluateSessionFormComponent?.getValue();
    if (config) {
      const evaluator = new Evaluator(config.serverAddr, this.evaluateService, config.friendlyName);
      evaluator.initialize().subscribe();
      this.evaluators.push(evaluator);
    }

    this.isCreationWindowVisible = false;
  }

  handleMouseEnter(evaluator: Evaluator): void {
    const name = evaluator.name;
    const friendlyName = evaluator.friendlyName;
    const topicId = evaluator.topicId;
    const serverAddr = evaluator.serverAddr;
    const seqNum = evaluator.seqNum;
    const lastContact = evaluator.lastContact;
    const initializedAt = evaluator.initializedAt;
    
    const dateFormat = 'yyyy-MM-dd HH:mm:ss';
    let lastContactString = '';
    let initializedString = '';

    if (lastContact !== undefined) {
      const contact = new Date(lastContact);
      lastContactString = format(contact, dateFormat);
    }

    if (initializedAt !== undefined) {
      const at = new Date(initializedAt);
      initializedString = format(at, dateFormat);
    }

    const keyValuePairs: KeyValuePair[] = [
      ['会话名称', name],
      ['别名', friendlyName ?? ''],
      ['TopicId', topicId ?? ''],
      ['服务器地址', serverAddr ?? ''],
      ['求值序号', seqNum?.toString() ?? ''],
      ['最后接触在', lastContactString],
      ['初始化在', initializedString],
    ];
    this.keyValuePairs = keyValuePairs;
  }

  handleMouseOut(): void {
    this.keyValuePairs = [];
  }
}
