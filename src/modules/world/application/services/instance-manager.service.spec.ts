import { describe, expect, it, beforeEach } from 'vitest';
import { InstanceManager } from './instance-manager.service.js';
import { MapId } from '../../domain/value-objects/ids.vo.js';
import { WorldEntity } from '../../domain/entities/world-entity.entity.js';
import { Position } from '../../domain/value-objects/position.vo.js';

describe('InstanceManager', () => {
  let manager: InstanceManager;

  beforeEach(() => {
    manager = new InstanceManager();
  });

  it('creates laboratory-01 then fills and opens laboratory-02', () => {
    const mapId = MapId.create('laboratory');
    const first = manager.findAvailableInstance(mapId, 2);
    expect(first.id.value).toBe('laboratory-01');

    first.addEntity(
      WorldEntity.createPlayer('a', Position.create(1, 1)),
    );
    first.addEntity(
      WorldEntity.createPlayer('b', Position.create(2, 1)),
    );

    const second = manager.findAvailableInstance(mapId, 2);
    expect(second.id.value).toBe('laboratory-02');
    expect(second.playerCount).toBe(0);
  });
});
