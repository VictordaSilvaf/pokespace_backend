import { World } from "../entities/world.entity.js";


export const WORLD_REPOSITORY = Symbol('WorldRepository');

export interface WorldRepository {
    findById(id: string): Promise<World | null>;
    list(): Promise<World[]>;
}