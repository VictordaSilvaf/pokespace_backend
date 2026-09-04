export class ServerDomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export class ServerNotFoundError extends Error {
    constructor (serverId: string) {
        super (`server not found: ${serverId}`);
    } 
}

export class InvalidServerStatusError extends ServerDomainError {
    constructor (status: string) {
        super (`invalid server status: ${status}`);
    }
}