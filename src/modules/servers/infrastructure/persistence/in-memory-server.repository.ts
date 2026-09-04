import { Injectable } from '@nestjs/common';
import type { ServerRepository } from '../../domain/repositories/server.repository.js';
import type { Server } from '../../domain/entities/server.entity.js';
import { createSeedServers } from './seed-servers.js';

@Injectable()
export class InMemoryServerRepository implements ServerRepository {
  private readonly byId = new Map<string, Server>();

  constructor() {
    for (const server of createSeedServers()) {
      this.byId.set(server.id, server);
    }
  }

  async findById(id: string): Promise<Server | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<Server[]> {
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