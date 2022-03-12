import { IPublicInputObject, IPublicOutputObject } from '../interfaces';

export class PublicInputObjectDto implements IPublicInputObject {
  constructor(
    public topicId: string,
    public exprInputString: string,
    public seqNum: number
  ) {}
}

export class PublicOutputObjectDto implements IPublicOutputObject {
  constructor(
    public topicId: string,
    public printContent: string,
    public exprContent: string,
    public seqNum: number
  ) {}
}
