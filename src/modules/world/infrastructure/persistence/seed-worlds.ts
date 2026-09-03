import { World } from "../../domain/entities/world.entity.js";
import { WorldName } from "../../domain/value-objects/world-name.vo.js";
import { WorldStatus } from "../../domain/value-objects/world-status.vo.js";

export const SEEDED_WORLD_IDS = {
    mercury: '11111111-1111-4111-8111-111111111111',
    venus: '22222222-2222-4222-8222-222222222222',
    earth: '33333333-3333-4333-8333-333333333333',
    mars: '44444444-4444-4444-8444-444444444444',
    jupiter: '55555555-5555-5555-8555-555555555555',
    saturn: '66666666-6666-6666-8666-666666666666',
    uranus: '77777777-7777-7777-8777-777777777777',
    neptune: '88888888-8888-8888-8888-888888888888',
    pluto: '99999999-9999-9999-8999-999999999999',
} as const;

export function createSeedWorlds(): World[] {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    return [
        World.rehydrate({
            id: SEEDED_WORLD_IDS.mercury,
            name: WorldName.create('Mercury'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'mercury',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.venus,
            name: WorldName.create('Venus'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'venus',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.earth,
            name: WorldName.create('Earth'),
            status: WorldStatus.create('maintenance'),
            createdAt,
            maxPlayers: 1100,
            region: 'earth',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.mars,
            name: WorldName.create('Mars'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'mars',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.jupiter,
            name: WorldName.create('Jupiter'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'jupiter',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.saturn,
            name: WorldName.create('Saturn'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'saturn',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.uranus,
            name: WorldName.create('Uranus'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'uranus',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.neptune,
            name: WorldName.create('Neptune'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'neptune',
        }),

        World.rehydrate({
            id: SEEDED_WORLD_IDS.pluto,
            name: WorldName.create('Pluto'),
            status: WorldStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'pluto',
        }),
    ];
}