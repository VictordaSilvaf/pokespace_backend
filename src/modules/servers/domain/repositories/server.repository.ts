import { Server } from "../entities/server.entity.js";


export const SERVER_REPOSITORY = Symbol('ServerRepository');

export interface ServerRepository {
    findById(id: string): Promise<Server | null>;
    list(): Promise<Server[]>;
}