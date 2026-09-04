import { Server } from "../../domain/entities/server.entity.js";
import { ServerName } from "../../domain/value-objects/server-name.vo.js";
import { ServerStatus } from "../../domain/value-objects/server-status.vo.js";

export const SEEDED_SERVER_IDS = {
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

export function createSeedServers(): Server[] {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    return [
        Server.rehydrate({
            id: SEEDED_SERVER_IDS.mercury,
            name: ServerName.create('Mercury'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'mercury',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.venus,
            name: ServerName.create('Venus'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'venus',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.earth,
            name: ServerName.create('Earth'),
            status: ServerStatus.create('maintenance'),
            createdAt,
            maxPlayers: 1100,
            region: 'earth',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.mars,
            name: ServerName.create('Mars'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'mars',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.jupiter,
            name: ServerName.create('Jupiter'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'jupiter',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.saturn,
            name: ServerName.create('Saturn'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'saturn',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.uranus,
            name: ServerName.create('Uranus'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'uranus',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.neptune,
            name: ServerName.create('Neptune'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'neptune',
        }),

        Server.rehydrate({
            id: SEEDED_SERVER_IDS.pluto,
            name: ServerName.create('Pluto'),
            status: ServerStatus.create('online'),
            createdAt,
            maxPlayers: 1100,
            region: 'pluto',
        }),
    ];
}