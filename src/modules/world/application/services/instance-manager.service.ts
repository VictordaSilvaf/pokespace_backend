import { Injectable } from '@nestjs/common';
import { MapId, InstanceId } from '../../domain/value-objects/ids.vo.js';
import { MapInstance } from '../../domain/entities/map-instance.entity.js';
import type { WorldEntity } from '../../domain/entities/world-entity.entity.js';
import { WorldDomainError } from '../../domain/errors/world.errors.js';

export const DEFAULT_INSTANCE_CAPACITY = 50;

@Injectable()
export class InstanceManager {
  private readonly instancesByMap = new Map<string, MapInstance[]>();
  private readonly instancesById = new Map<string, MapInstance>();

  findAvailableInstance(
    mapId: MapId,
    capacity = DEFAULT_INSTANCE_CAPACITY,
  ): MapInstance {
    const list = this.instancesByMap.get(mapId.value) ?? [];
    const open = list.find((i) => i.hasCapacity());
    if (open) {
      return open;
    }
    return this.createInstance(mapId, capacity);
  }

  createInstance(
    mapId: MapId,
    capacity = DEFAULT_INSTANCE_CAPACITY,
  ): MapInstance {
    const list = this.instancesByMap.get(mapId.value) ?? [];
    const index = list.length + 1;
    const id = InstanceId.create(`${mapId.value}-${String(index).padStart(2, '0')}`);
    const instance = MapInstance.create({
      id,
      mapId,
      capacity,
      index,
    });
    list.push(instance);
    this.instancesByMap.set(mapId.value, list);
    this.instancesById.set(id.value, instance);
    return instance;
  }

  getInstance(instanceId: string): MapInstance | undefined {
    return this.instancesById.get(instanceId);
  }

  addEntity(instanceId: string, entity: WorldEntity): void {
    const instance = this.requireInstance(instanceId);
    instance.addEntity(entity);
  }

  removeEntity(instanceId: string, entityId: string): WorldEntity | undefined {
    const instance = this.instancesById.get(instanceId);
    if (!instance) {
      return undefined;
    }
    return instance.removeEntity(entityId);
  }

  getEntities(instanceId: string): WorldEntity[] {
    return this.requireInstance(instanceId).getEntities();
  }

  listInstances(mapId: string): MapInstance[] {
    return [...(this.instancesByMap.get(mapId) ?? [])];
  }

  private requireInstance(instanceId: string): MapInstance {
    const instance = this.instancesById.get(instanceId);
    if (!instance) {
      throw new WorldDomainError(`instance not found: ${instanceId}`);
    }
    return instance;
  }
}
