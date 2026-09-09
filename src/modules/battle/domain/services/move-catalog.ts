import { Move } from '../../domain/value-objects/move.vo.js';

const MOVES: Move[] = [
  Move.create({
    id: 'tackle',
    name: 'Tackle',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    missileAssetKey: 'effects/tackle',
  }),
  Move.create({
    id: 'ember',
    name: 'Ember',
    type: 'fire',
    category: 'special',
    power: 40,
    accuracy: 100,
    effect: 'burn_chance',
    missileAssetKey: 'effects/ember',
  }),
  Move.create({
    id: 'water-gun',
    name: 'Water Gun',
    type: 'water',
    category: 'special',
    power: 40,
    accuracy: 100,
    missileAssetKey: 'effects/water-gun',
  }),
  Move.create({
    id: 'thunder-shock',
    name: 'Thunder Shock',
    type: 'electric',
    category: 'special',
    power: 40,
    accuracy: 100,
    effect: 'paralyze_chance',
    missileAssetKey: 'effects/thunder-shock',
  }),
  Move.create({
    id: 'vine-whip',
    name: 'Vine Whip',
    type: 'grass',
    category: 'physical',
    power: 45,
    accuracy: 100,
    missileAssetKey: 'effects/vine-whip',
  }),
  Move.create({
    id: 'growl',
    name: 'Growl',
    type: 'normal',
    category: 'status',
    power: 0,
    accuracy: 100,
    effect: 'attack_down',
  }),
];

export function listMoves(): Move[] {
  return [...MOVES];
}

export function getMoveById(id: string): Move | null {
  return MOVES.find((m) => m.id === id) ?? null;
}

export function starterMovesForType(types: string[]): Move[] {
  const primary = types[0] ?? 'normal';
  const byType: Record<string, string> = {
    fire: 'ember',
    water: 'water-gun',
    electric: 'thunder-shock',
    grass: 'vine-whip',
  };
  const special = getMoveById(byType[primary] ?? 'tackle')!;
  return [getMoveById('tackle')!, special, getMoveById('growl')!];
}
