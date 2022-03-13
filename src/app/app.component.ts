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
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

type KeyValuePair = [string, string];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  defaultSessionServerAddr = 'https://evaluate.exploro.one';
  defaultSessionAlias = '服务器会话';
  evaluators: Evaluator[] = [];
  isCreationWindowVisible = false;
  isCreationWindowValid = false;
  keyValuePairs: KeyValuePair[] = [];
  sessionSelectForm = new FormControl(null, [Validators.required]);

  private get activeEvaluator(): Evaluator {
    return this.evaluators[this.sessionSelectForm.value];
  }

  @ViewChild(PseudoTerminalComponent) pseudoTerminal?: PseudoTerminalComponent;
  @ViewChild(EvaluateSessionFormComponent) evaluateSessionFormComponent?: EvaluateSessionFormComponent;

  constructor(private evaluateService: EvaluateService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(queryParams => {
      const qDefaultSessionServerAddr = queryParams['defaultSessionServerAddr'];
      const qDefaultSessionAlias = queryParams['defaultSessionAlias'];
      if (typeof qDefaultSessionServerAddr === 'string' && qDefaultSessionServerAddr.length > 0) {
        this.defaultSessionServerAddr = qDefaultSessionServerAddr;
      }

      if (typeof qDefaultSessionAlias === 'string' && qDefaultSessionAlias.length > 0) {
        this.defaultSessionAlias = qDefaultSessionAlias;
      }
    });
  }

  ngAfterViewInit(): void {
    const defaultEvaluator = new Evaluator(this.defaultSessionServerAddr, this.evaluateService, this.defaultSessionAlias);
    this.evaluators.push(defaultEvaluator);
    const localEvaluator = new Evaluator('http://127.0.0.1:3000', this.evaluateService, '本地会话');
    this.evaluators.push(localEvaluator);
    localEvaluator.initialize().subscribe();

    defaultEvaluator.initialize().subscribe((dto) => {
      if (dto.topicId) {
        
        this.sessionSelectForm.setValue(0);

        const seqNum = dto.initialSeqNum;
        window.setTimeout(() => {
          this.pseudoTerminal?.prompt(`In[${seqNum}]:= `);
        });
      }
    });
  }

  handleTerminalFlush(inputContent: string): void {
    const evaluator = this.activeEvaluator;
    evaluator.evaluate(inputContent.trim()).subscribe(ans => {
      this.pseudoTerminal?.print('\n');
      const outputPrompt = `Out[${ans.seqNum}]= `;
      this.pseudoTerminal?.print(outputPrompt);
      this.pseudoTerminal?.print(ans.exprContent);
      this.pseudoTerminal?.print('\n\n');
      this.pseudoTerminal?.prompt(`In[${evaluator.seqNum}]:= `);
    })
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
