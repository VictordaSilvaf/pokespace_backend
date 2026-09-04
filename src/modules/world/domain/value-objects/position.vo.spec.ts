import { describe, expect, it } from 'vitest';
import { Position } from './position.vo.js';
import { WorldDomainError } from '../errors/world.errors.js';

describe('Position', () => {
  it('creates integer grid coordinates', () => {
    const p = Position.create(10, 8, 0);
    expect(p.toJSON()).toEqual({ x: 10, y: 8, z: 0 });
    expect(p.key()).toBe('10:8:0');
  });

  it('rejects non-integers', () => {
    expect(() => Position.create(1.5, 2)).toThrow(WorldDomainError);
  });

  it('offsets for movement', () => {
    expect(Position.create(10, 8).offset(0, -1).toJSON()).toEqual({
      x: 10,
      y: 7,
      z: 0,
    });
  });
});
