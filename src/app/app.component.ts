import { Component, ViewChild } from '@angular/core';
import { PublicOutputObjectDto } from './dtos/input-output-dto';
import { EvaluateSessionFormComponent } from './evaluate-session-form/evaluate-session-form.component';
import { EvaluateService, Evaluator } from './evaluate.service';
import { PseudoTerminalComponent } from './pseudo-terminal/pseudo-terminal.component';
import { format } from 'date-fns';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

type KeyValuePair = [string, string];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  defaultSessionServerAddr = 'http://173.82.245.214';
  defaultSessionAlias = '服务器会话';
  evaluators: Evaluator[] = [];
  pseudoTerminalStateStorage: string[] = [];
  isCreationWindowVisible = false;
  isCreationWindowValid = false;
  keyValuePairs: KeyValuePair[] = [];
  sessionSelectCtrl = new FormControl(null, [Validators.required]);
  sessionSelectForm = new FormGroup({
    evaluatorIdx: this.sessionSelectCtrl,
  });

  private get activeEvaluator(): Evaluator {
    return this.evaluators[this.sessionSelectCtrl.value];
  }

  @ViewChild(PseudoTerminalComponent) pseudoTerminal?: PseudoTerminalComponent;
  @ViewChild(EvaluateSessionFormComponent)
  evaluateSessionFormComponent?: EvaluateSessionFormComponent;

  constructor(
    private evaluateService: EvaluateService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((queryParams) => {
      const qDefaultSessionServerAddr = queryParams['defaultSessionServerAddr'];
      const qDefaultSessionAlias = queryParams['defaultSessionAlias'];
      if (
        typeof qDefaultSessionServerAddr === 'string' &&
        qDefaultSessionServerAddr.length > 0
      ) {
        this.defaultSessionServerAddr = qDefaultSessionServerAddr;
      }

      if (
        typeof qDefaultSessionAlias === 'string' &&
        qDefaultSessionAlias.length > 0
      ) {
        this.defaultSessionAlias = qDefaultSessionAlias;
      }
    });
  }

  ngAfterViewInit(): void {
    const defaultEvaluator = new Evaluator(
      this.defaultSessionServerAddr,
      this.evaluateService,
      this.defaultSessionAlias
    );
    const localEvaluator = new Evaluator(
      'http://127.0.0.1:3000',
      this.evaluateService,
      '本地会话'
    );
    this.appendEvaluator(defaultEvaluator);
    this.appendEvaluator(localEvaluator);

    this.loadDefaultEvaluator();

    this.sessionSelectCtrl.valueChanges.subscribe((current) => {
      const prev = this.sessionSelectForm.value['evaluatorIdx'];
      if (prev === current) {
        return;
      }
      this.loadEvaluator(current, prev === null ? undefined: prev);
    })
  }

  private loadDefaultEvaluator(): void {
    window.setTimeout(() => {
      this.sessionSelectCtrl.setValue(0);
    });
  }

  private loadEvaluator(evaluatorIdx: number, previousEvaluatorIdx?: number): void {
    const evaluator = this.evaluators[evaluatorIdx];
    evaluator.afterInitilized().subscribe(() => {
      if (previousEvaluatorIdx === undefined) {
        // 这种情况属于初次加载
        const seqNum = evaluator.seqNum;
        window.setTimeout(() => {
          this.promptForInput(seqNum ?? '');
        });
      }
      else if (previousEvaluatorIdx !== undefined && evaluatorIdx !== previousEvaluatorIdx) {
        // 这种情况属于切换
        if (this.pseudoTerminal) {
          // 先把当终端模拟器的字符数据存下来
          const pseudoTerminalState = this.pseudoTerminal.store();
          this.pseudoTerminalStateStorage[previousEvaluatorIdx] = pseudoTerminalState;
          const savedState = this.pseudoTerminalStateStorage[evaluatorIdx];

          if (savedState) {
            // 如果之前访问过这个 session 并且保存了状态，则恢复状态
            this.pseudoTerminal.load(savedState);
          }
          else {
            // 之前没有访问过这个 session
            this.pseudoTerminal.clear(); 
            this.promptForInput(evaluator.seqNum ?? '');
          }
        }
      }
      else {}
    });
  }

  private promptForInput(seqNum: number | string): void {
    this.pseudoTerminal?.prompt(`In[${seqNum}]:= `);
  }

  private appendEvaluator(evaluator: Evaluator): void {
    this.evaluators.push(evaluator);
    if (!evaluator.initialized) {
      evaluator.initialize().subscribe();
    }
  }

  private appendAnswer(ans: PublicOutputObjectDto): void {
    this.pseudoTerminal?.print('\n');
    const outputPrompt = `Out[${ans.seqNum}]= `;
    this.pseudoTerminal?.print(outputPrompt);
    this.pseudoTerminal?.print(ans.exprContent);
    this.pseudoTerminal?.print('\n\n');
  }

  handleTerminalFlush(inputContent: string): void {
    this.activeEvaluator.evaluate(inputContent.trim()).subscribe((ans) => {
      this.appendAnswer(ans);
      this.promptForInput(this.activeEvaluator.seqNum ?? '');
    });
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
      const evaluator = new Evaluator(
        config.serverAddr,
        this.evaluateService,
        config.friendlyName
      );
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
