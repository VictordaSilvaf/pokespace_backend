export class WorldDomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export class WorldNotFoundError extends Error {
    constructor (worldId: string) {
        super (`world not found: ${worldId}`);
    } 
}

export class InvalidWorldStatusError extends WorldDomainError {
    constructor (status: string) {
        super (`invalid world status: ${status}`);
    }
}