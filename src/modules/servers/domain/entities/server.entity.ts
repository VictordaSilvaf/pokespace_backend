import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { ServerName } from '../value-objects/server-name.vo.js';
import { ServerStatus } from '../value-objects/server-status.vo.js';
import { ServerDomainError } from '../errors/server.errors.js';

export interface ServerProps {
  id: string;
  name: ServerName;
  region: string;
  status: ServerStatus;
  maxPlayers: number;
  createdAt: Date;
}

export class Server extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _name: ServerName,
    private readonly _region: string,
    private readonly _status: ServerStatus,
    private readonly _maxPlayers: number,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static rehydrate(props: ServerProps): Server {
    if (props.maxPlayers < 1) {
      throw new ServerDomainError(
        'INVALID_MAX_PLAYERS',
        'maxPlayers must be >= 1',
      );
    }

    const region = props.region.trim();
    if (region.length < 2 || region.length > 50) {
      throw new ServerDomainError(
        'INVALID_REGION',
        'region must be 2–50 characters',
      );
    }

    return new Server(
      props.id,
      props.name,
      region,
      props.status,
      props.maxPlayers,
      props.createdAt,
    );
  }

  get name(): ServerName {
    return this._name;
  }

  get region(): string {
    return this._region;
  }

  get status(): ServerStatus {
    return this._status;
  }

  get maxPlayers(): number {
    return this._maxPlayers;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isJoinable(): boolean {
    return this._status.isJoinable();
  }
}