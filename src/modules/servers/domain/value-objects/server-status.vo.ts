import { ValueObject } from '../../../../shared/domain/value-object.js';
import { InvalidServerStatusError } from '../errors/server.errors.js';

export const SERVER_STATUSES = ['online', 'maintenance', 'offline'] as const;

export type ServerStatusValue = (typeof SERVER_STATUSES)[number];

interface ServerStatusProps {
  value: ServerStatusValue;
}

export class ServerStatus extends ValueObject<ServerStatusProps> {
  private constructor(props: ServerStatusProps) {
    super(props);
  }

  static create(raw: string): ServerStatus {
    if (!SERVER_STATUSES.includes(raw as ServerStatusValue)) {
      throw new InvalidServerStatusError(raw);
    }

    return new ServerStatus({ value: raw as ServerStatusValue });
  }

  get value(): ServerStatusValue {
    return this.props.value;
  }

  isJoinable(): boolean {
    return this.props.value === 'online';
  }
}