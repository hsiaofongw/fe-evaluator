import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import {
  PublicInputObjectDto,
  PublicOutputObjectDto,
} from './dtos/input-output-dto';
import { REPLEnvironmentDescriptorDto } from './dtos/repl-dto';

export interface IEvaluateSession {
  topicId: string;
  seqNum: number;
  serverAddr: string;
}

export class Evaluator {
  private session?: IEvaluateSession;
  private _lastContact?: number;
  private _initializeAt?: number;

  public get topicId(): string | undefined {
    return this.session?.topicId ?? undefined;
  }

  public get seqNum(): number | undefined {
    return this.session?.seqNum;
  }

  public get initialized(): boolean {
    return this.session !== undefined;
  }

  public get name(): string {
    return this.friendlyName ?? this.session?.topicId ?? '正在初始化...';
  }

  public get lastContact(): number | undefined {
    return this._lastContact;
  }

  public get initializedAt(): number | undefined {
    return this._initializeAt;
  }

  private initialized$ = new Subject<void>();

  constructor(
    public readonly serverAddr: string,
    private evaluateService: EvaluateService,
    public friendlyName?: string,
  ) {}

  public initialize(): Observable<REPLEnvironmentDescriptorDto> {
    return this.evaluateService.createSession(this.serverAddr).pipe(
      tap((dto) => {
        if (typeof dto.topicId === 'string' && dto.topicId.length > 0) {
          const session: IEvaluateSession = {
            topicId: dto.topicId,
            seqNum: dto.initialSeqNum,
            serverAddr: this.serverAddr,
          };
          this.session = session;
          const now = new Date();
          const nowValue = now.valueOf();
          this._lastContact = nowValue;
          this._initializeAt = nowValue;
          this.initialized$.next();
        }
      })
    );
  }

  public afterInitilized(): Observable<void> {
    return new Observable<void>(obs => {
      if (this.initialized) {
        obs.next();
        obs.complete();
      }
      else {
        this.initialized$.subscribe(() => {
          obs.next();
          obs.complete();
        });
      }
    });
  }

  public evaluate(exprString: string): Observable<PublicOutputObjectDto> {
    const identityOutput: PublicOutputObjectDto = new PublicOutputObjectDto(
      '',
      '',
      '',
      0
    );
    if (this.session === undefined) {
      return of(identityOutput);
    }

    const session = this.session;
    return this.evaluateService.evaluate(session, exprString).pipe(
      tap((dto) => {
        if (dto.seqNum === session.seqNum) {
          session.seqNum = session.seqNum + 1;
          const now = new Date();
          this._lastContact = now.valueOf();
        }
      })
    );
  }
}

@Injectable({
  providedIn: 'root',
})
export class EvaluateService {
  constructor(private httpClient: HttpClient) {}

  public createSession(
    serverAddr: string
  ): Observable<REPLEnvironmentDescriptorDto> {
    return this.httpClient.post<REPLEnvironmentDescriptorDto>(
      serverAddr + '/session',
      {}
    );
  }

  public evaluate(
    session: IEvaluateSession,
    exprString: string
  ): Observable<PublicOutputObjectDto> {
    const payload: PublicInputObjectDto = new PublicInputObjectDto(
      session.topicId,
      exprString,
      session.seqNum
    );
    return this.httpClient.post<PublicOutputObjectDto>(
      session.serverAddr + '/evaluate',
      payload
    );
  }
}
