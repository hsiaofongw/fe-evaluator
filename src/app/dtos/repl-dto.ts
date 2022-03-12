import { IREPLEnvironmentDescriptor } from '../interfaces';

export class REPLEnvironmentDescriptorDto
  implements IREPLEnvironmentDescriptor
{
  constructor(public topicId: string, public initialSeqNum: number) {}
}
