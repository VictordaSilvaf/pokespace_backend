import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { WorldName } from '../value-objects/world-name.vo.js';
import { WorldStatus } from '../value-objects/world-status.vo.js';
import { WorldDomainError } from '../errors/world.errors.js';

export interface WorldProps {
  id: string;
  name: WorldName;
  region: string;
  status: WorldStatus;
  maxPlayers: number;
  createdAt: Date;
}

export class World extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _name: WorldName,
    private readonly _region: string,
    private readonly _status: WorldStatus,
    private readonly _maxPlayers: number,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static rehydrate(props: WorldProps): World {
    if (props.maxPlayers < 1) {
      throw new WorldDomainError('maxPlayers must be >= 1');
    }

    const region = props.region.trim();
    if (region.length < 2 || region.length > 50) {
      throw new WorldDomainError('region must be 2–50 characters');
    }

    return new World(
      props.id,
      props.name,
      region,
      props.status,
      props.maxPlayers,
      props.createdAt,
    );
  }

  get name(): WorldName {
    return this._name;
  }

  get region(): string {
    return this._region;
  }

  get status(): WorldStatus {
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