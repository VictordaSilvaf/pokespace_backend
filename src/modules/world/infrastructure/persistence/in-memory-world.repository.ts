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
    return [...this.byId.values()];
  }
}
