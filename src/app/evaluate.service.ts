import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PublicInputObjectDto, PublicOutputObjectDto } from './dtos/input-output-dto';
import { REPLEnvironmentDescriptorDto } from './dtos/repl-dto';

@Injectable({
  providedIn: 'root',
})
export class EvaluateService {
  private currentTopicId?: string;
  private currentSeqNumber?: number;
  private currentServerAddress?: string;

  constructor(private httpClient: HttpClient) {}

  public getTopicId(): string | undefined {
    return this.currentTopicId;
  }

  public setTopicId(topicId: string): void {
    this.currentTopicId = topicId;
  }

  public getSeqNum(): number | undefined {
    return this.currentSeqNumber;
  }

  public setSeqNum(seqNum: number): void {
    this.currentSeqNumber = seqNum;
  }

  public getServerAddr(): string | undefined {
    return this.currentServerAddress;
  }

  public setServerAddress(serverAddr: string): void {
    this.currentServerAddress = serverAddr;
  }

  public createSession(): Observable<REPLEnvironmentDescriptorDto> | undefined {
    if (this.currentServerAddress) {
      return this.httpClient.post<REPLEnvironmentDescriptorDto>(
        this.currentServerAddress + '/session',
        {}
      ).pipe(tap(dto => {
        if (typeof dto.topicId === 'string' && dto.topicId.length > 0) {
          this.currentTopicId = dto.topicId;
          this.currentSeqNumber = dto.initialSeqNum;
        }
      }));
    }
    return undefined;
  }

  public evaluate(exprStringInput: string): Observable<PublicOutputObjectDto> | undefined {
    if (this.currentTopicId !== undefined && this.currentServerAddress !== undefined && this.currentSeqNumber !== undefined) {
      const payload: PublicInputObjectDto = new PublicInputObjectDto(this.currentTopicId, exprStringInput, this.currentSeqNumber);
      return this.httpClient.post<PublicOutputObjectDto>(this.currentServerAddress + '/evaluate', payload);
    }

    return undefined;
  }
}

