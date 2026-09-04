export class CharacterDomainError extends Error {
  readonly code: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(
    code: string,
    message: string,
    args?: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.args = args;
  }
}

export class InvalidDisplayNameError extends CharacterDomainError {
  constructor(
    code: 'INVALID_DISPLAY_NAME' | 'INVALID_DISPLAY_NAME_FORMAT' = 'INVALID_DISPLAY_NAME',
  ) {
    const messages = {
      INVALID_DISPLAY_NAME: 'Invalid display name',
      INVALID_DISPLAY_NAME_FORMAT:
        'Display name must be 3–16 characters: letters, numbers, spaces or underscore',
    } as const;
    super(code, messages[code]);
  }
}

export class InvalidStarterSkinError extends CharacterDomainError {
  constructor(skinId: string) {
    super('INVALID_STARTER_SKIN', `Invalid starter skin: ${skinId}`, {
      skinId,
    });
  }
}

export class CharacterLimitReachedError extends CharacterDomainError {
  constructor(limit: number) {
    super(
      'CHARACTER_LIMIT_REACHED',
      `Maximum of ${limit} characters reached for this account`,
      { limit },
    );
  }
}

export class DisplayNameTakenError extends CharacterDomainError {
  constructor(displayName: string) {
    super(
      'DISPLAY_NAME_TAKEN',
      `Display name already taken on this account: ${displayName}`,
      { displayName },
    );
  }
}

export class WorldNotAvailableError extends CharacterDomainError {
  constructor(worldId: string) {
    super(
      'WORLD_NOT_AVAILABLE',
      `World is not available for character creation: ${worldId}`,
      { worldId },
    );
  }
}

export class CharacterNotFoundError extends CharacterDomainError {
  constructor(characterId: string) {
    super('CHARACTER_NOT_FOUND', `Character not found: ${characterId}`, {
      characterId,
    });
  }
}
