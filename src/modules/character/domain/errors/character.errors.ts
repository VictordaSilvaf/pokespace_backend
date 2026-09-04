export class CharacterDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class CharacterNameTakenError extends CharacterDomainError {
  constructor(name: string, serverId: string) {
    super(`character name "${name}" already taken on server ${serverId}`);
  }
}

export class CharacterLimitReachedError extends CharacterDomainError {
  constructor(accountId: string) {
    super(`character limit reached for account ${accountId}`);
  }
}

export class ServerNotJoinableError extends CharacterDomainError {
  constructor(serverId: string) {
    super(`server is not joinable: ${serverId}`);
  }
}

export class CharacterNotFoundError extends CharacterDomainError {
  constructor(characterId: string) {
    super(`character not found: ${characterId}`);
  }
}

export class CharacterAccessDeniedError extends CharacterDomainError {
  constructor() {
    super('character does not belong to this account');
  }
}
