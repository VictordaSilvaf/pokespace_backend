import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import {
  BattleAlreadyFinishedError,
  BattleDomainError,
} from '../errors/battle.errors.js';
import type { Move } from '../value-objects/move.vo.js';

export type BattleStatus = 'active' | 'won' | 'lost' | 'fled' | 'captured';

export interface BattlerState {
  entityId: string;
  dexId: number;
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  statusEffect: string | null;
}

export interface BattleProps {
  id: string;
  characterId: string;
  player: BattlerState;
  wild: BattlerState;
  status: BattleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  hit: boolean;
  appliedEffect: string | null;
}

export class Battle extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _characterId: string,
    private _player: BattlerState,
    private _wild: BattlerState,
    private _status: BattleStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super(id);
  }

  static start(input: {
    characterId: string;
    player: Omit<BattlerState, 'hp' | 'statusEffect'> & { hp?: number };
    wild: Omit<BattlerState, 'hp' | 'statusEffect'> & { hp?: number };
  }): Battle {
    const now = new Date();
    return new Battle(
      randomUUID(),
      input.characterId,
      {
        ...input.player,
        hp: input.player.hp ?? input.player.maxHp,
        statusEffect: null,
      },
      {
        ...input.wild,
        hp: input.wild.hp ?? input.wild.maxHp,
        statusEffect: null,
      },
      'active',
      now,
      now,
    );
  }

  static rehydrate(props: BattleProps): Battle {
    return new Battle(
      props.id,
      props.characterId,
      props.player,
      props.wild,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
  }

  get characterId(): string {
    return this._characterId;
  }

  get player(): BattlerState {
    return this._player;
  }

  get wild(): BattlerState {
    return this._wild;
  }

  get status(): BattleStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  useMove(actor: 'player' | 'wild', move: Move): DamageResult {
    this.assertActive();
    const attacker = actor === 'player' ? this._player : this._wild;
    const defender = actor === 'player' ? this._wild : this._player;

    const hitRoll = Math.random() * 100;
    if (hitRoll > move.accuracy) {
      this.touch();
      return { damage: 0, effectiveness: 1, hit: false, appliedEffect: null };
    }

    if (move.category === 'status') {
      const effect = move.effect ?? 'none';
      defender.statusEffect = effect;
      this.touch();
      return { damage: 0, effectiveness: 1, hit: true, appliedEffect: effect };
    }

    const atk =
      move.category === 'physical' ? attacker.attack : attacker.specialAttack;
    const def =
      move.category === 'physical' ? defender.defense : defender.specialDefense;
    const levelFactor = (2 * attacker.level) / 5 + 2;
    const base = Math.floor(
      ((levelFactor * move.power * (atk / Math.max(1, def))) / 50 + 2) *
        (0.85 + Math.random() * 0.15),
    );
    const damage = Math.max(1, base);
    defender.hp = Math.max(0, defender.hp - damage);

    if (defender.hp === 0) {
      this._status = actor === 'player' ? 'won' : 'lost';
    }

    this.touch();
    return {
      damage,
      effectiveness: 1,
      hit: true,
      appliedEffect: move.effect ?? null,
    };
  }

  tryCapture(ballBonus = 1): { captured: boolean; shakeChecks: number } {
    this.assertActive();
    const maxHp = this._wild.maxHp;
    const hp = this._wild.hp;
    const catchRate = Math.max(
      1,
      Math.floor(((3 * maxHp - 2 * hp) * 45 * ballBonus) / (3 * maxHp)),
    );
    const threshold = Math.min(255, catchRate);
    let shakes = 0;
    for (let i = 0; i < 3; i++) {
      if (Math.floor(Math.random() * 255) < threshold) {
        shakes += 1;
      } else {
        break;
      }
    }
    const captured = shakes === 3 || threshold >= 255;
    if (captured) {
      this._status = 'captured';
    }
    this.touch();
    return { captured, shakeChecks: shakes };
  }

  flee(): boolean {
    this.assertActive();
    const odds = this._player.speed / Math.max(1, this._wild.speed);
    const fled = Math.random() < Math.min(0.9, 0.3 + odds * 0.2);
    if (fled) {
      this._status = 'fled';
    }
    this.touch();
    return fled;
  }

  private assertActive(): void {
    if (this._status !== 'active') {
      throw new BattleAlreadyFinishedError(this.id);
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}

export function deriveStatsFromBase(
  base: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  },
  level: number,
): Omit<BattlerState, 'entityId' | 'dexId' | 'name' | 'statusEffect'> {
  if (level < 1) {
    throw new BattleDomainError('INVALID_LEVEL', 'level must be >= 1');
  }
  const scale = (stat: number) =>
    Math.floor(((2 * stat * level) / 100 + 5) * 1);
  return {
    level,
    maxHp: Math.floor(((2 * base.hp * level) / 100 + level + 10)),
    hp: Math.floor(((2 * base.hp * level) / 100 + level + 10)),
    attack: scale(base.attack),
    defense: scale(base.defense),
    specialAttack: scale(base.specialAttack),
    specialDefense: scale(base.specialDefense),
    speed: scale(base.speed),
  };
}
