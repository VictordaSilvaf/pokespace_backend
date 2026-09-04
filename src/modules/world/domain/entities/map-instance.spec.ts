import { describe, expect, it, beforeEach } from 'vitest';
import { MapInstance } from '../entities/map-instance.entity.js';
import { WorldEntity } from '../entities/world-entity.entity.js';
import { MapId, InstanceId } from '../value-objects/ids.vo.js';
import { Position } from '../value-objects/position.vo.js';
import { WorldSession } from '../entities/world-session.entity.js';

describe('MapInstance', () => {
  it('holds multiple players and tracks occupation', () => {
    const instance = MapInstance.create({
      id: InstanceId.create('laboratory-01'),
      mapId: MapId.create('laboratory'),
      capacity: 50,
      index: 1,
    });

    const a = WorldEntity.createPlayer('aaa', Position.create(10, 8));
    const b = WorldEntity.createPlayer('bbb', Position.create(12, 8));
    instance.addEntity(a);
    instance.addEntity(b);

    expect(instance.playerCount).toBe(2);
    expect(instance.isOccupied(Position.create(10, 8))).toBe(true);
    instance.moveEntity(a.id, Position.create(10, 9));
    expect(instance.isOccupied(Position.create(10, 8))).toBe(false);
    expect(instance.getEntity(a.id)?.position.toJSON()).toEqual({
      x: 10,
      y: 9,
      z: 0,
    });
  });
});

describe('WorldSession sequence', () => {
  let session: WorldSession;

  beforeEach(() => {
    session = WorldSession.create({
      connectionId: 'c1',
      characterId: 'ch1',
      accountId: 'acc1',
      mapId: MapId.create('laboratory'),
      instanceId: InstanceId.create('laboratory-01'),
      entityId: 'player-ch1',
      position: Position.create(10, 8),
      lastSequence: 40,
    });
  });

  it('accepts increasing sequence', () => {
    expect(session.acceptSequence(41)).toBe(true);
    expect(session.lastSequence).toBe(41);
  });

  it('rejects old or equal sequence', () => {
    expect(session.acceptSequence(40)).toBe(false);
    expect(session.acceptSequence(39)).toBe(false);
    expect(session.lastSequence).toBe(40);
  });
});
