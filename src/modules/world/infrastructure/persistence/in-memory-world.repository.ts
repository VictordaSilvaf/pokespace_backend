import { Injectable } from '@nestjs/common';
import type { WorldRepository } from '../../domain/repositories/world.repository.js';
import type { World } from '../../domain/entities/world.entity.js';
import { createSeedWorlds } from './seed-worlds.js';

@Injectable()
export class InMemoryWorldRepository implements WorldRepository {
  private readonly byId = new Map<string, World>();

  constructor() {
    for (const world of createSeedWorlds()) {
      this.byId.set(world.id, world);
    }
  }

  async findById(id: string): Promise<World | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<World[]> {
    const statusRank: Record<string, number> = {
      online: 0,
      maintenance: 1,
      offline: 2,
    };

    return [...this.byId.values()].sort((a, b) => {
      const byStatus =
        (statusRank[a.status.value] ?? 99) - (statusRank[b.status.value] ?? 99);
      if (byStatus !== 0) {
        return byStatus;
      }
      return a.name.value.localeCompare(b.name.value);
    });
  }
}