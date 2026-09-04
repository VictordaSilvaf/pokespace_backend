import { describe, expect, it } from 'vitest';
import { WorldMap } from '../entities/world-map.entity.js';
import { MapId } from '../value-objects/ids.vo.js';
import { Position } from '../value-objects/position.vo.js';
import { CollisionService } from './collision.service.js';
import { SpawnService } from './spawn.service.js';
import { DEFAULT_PLAYER_MOVEMENT } from '../value-objects/movement.js';
import { SpawnUnavailableError } from '../errors/world.errors.js';

function makeMap(): WorldMap {
  // 3x3: walls on border, open center
  const collision = [
    [true, true, true],
    [true, false, true],
    [true, true, true],
  ];
  return WorldMap.create({
    id: MapId.create('lab-test'),
    name: 'Test',
    width: 3,
    height: 3,
    tileSize: 16,
    collision,
    spawnPoints: [
      { id: 's1', position: Position.create(1, 1) },
      { id: 's2', position: Position.create(0, 0) }, // blocked
    ],
    version: '1',
  });
}

describe('CollisionService', () => {
  const collision = new CollisionService();

  it('allows move to walkable tile', () => {
    const map = makeMap();
    expect(
      collision.canMove(
        map,
        Position.create(1, 1),
        Position.create(1, 1),
        DEFAULT_PLAYER_MOVEMENT,
      ),
    ).toBe(true);
  });

  it('blocks move to collision tile', () => {
    const map = makeMap();
    expect(
      collision.canMove(
        map,
        Position.create(1, 1),
        Position.create(0, 1),
        DEFAULT_PLAYER_MOVEMENT,
      ),
    ).toBe(false);
  });
});

describe('SpawnService', () => {
  it('picks walkable unoccupied spawn', () => {
    const map = makeMap();
    const spawn = new SpawnService().findSpawn(map, new Set());
    expect(spawn.toJSON()).toEqual({ x: 1, y: 1, z: 0 });
  });

  it('skips occupied spawn and fails when none left', () => {
    const map = makeMap();
    const occupied = new Set(['1:1:0']);
    expect(() => new SpawnService().findSpawn(map, occupied)).toThrow(
      SpawnUnavailableError,
    );
  });
});
