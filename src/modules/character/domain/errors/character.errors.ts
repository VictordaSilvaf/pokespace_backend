export class CharacterDomainError extends Error {
  readonly code?: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(
    code: string | undefined,
    message: string,
    args?: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.args = args;
  }
}

export class InvalidCharacterNameError extends CharacterDomainError {
  constructor(
    code: 'INVALID_CHARACTER_NAME' | 'INVALID_CHARACTER_NAME_FORMAT' = 'INVALID_CHARACTER_NAME',
  ) {
    const messages = {
      INVALID_CHARACTER_NAME: 'Invalid character name',
      INVALID_CHARACTER_NAME_FORMAT:
        'Character name must be 2–16 characters: letters, numbers or underscore',
    } as const;
    super(code, messages[code]);
  }
}

export class CharacterNameTakenError extends CharacterDomainError {
  constructor(name: string, serverId: string) {
    super(
      'CHARACTER_NAME_TAKEN',
      `character name "${name}" already taken on server ${serverId}`,
      { name, serverId },
    );
  }
}

export class CharacterLimitReachedError extends CharacterDomainError {
  constructor(accountId: string, limit: number) {
    super(
      'CHARACTER_LIMIT_REACHED',
      `character limit reached for account ${accountId}`,
      { accountId, limit },
    );
  }
}

export class ServerNotJoinableError extends CharacterDomainError {
  constructor(serverId: string) {
    super(
      'SERVER_NOT_JOINABLE',
      `server is not joinable: ${serverId}`,
      { serverId },
    );
  }
}

export class CharacterNotFoundError extends CharacterDomainError {
  constructor(characterId: string) {
    super(
      'CHARACTER_NOT_FOUND',
      `character not found: ${characterId}`,
      { characterId },
    );
  }
}

export class CharacterAccessDeniedError extends CharacterDomainError {
  constructor() {
    super('CHARACTER_ACCESS_DENIED', 'character does not belong to this account');
  }
}
