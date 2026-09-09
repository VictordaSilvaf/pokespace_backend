import { Injectable } from '@nestjs/common';
import type { BattleRepository } from '../../domain/repositories/battle.repository.js';
import type { Battle } from '../../domain/entities/battle.entity.js';

@Injectable()
export class InMemoryBattleRepository implements BattleRepository {
  private readonly byId = new Map<string, Battle>();

  async save(battle: Battle): Promise<void> {
    this.byId.set(battle.id, battle);
  }

  async findById(id: string): Promise<Battle | null> {
    return this.byId.get(id) ?? null;
  }
}
