export class PokemonDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PokemonDomainError';
  }
}

export class PokemonNotFoundError extends PokemonDomainError {
  constructor(dexId: number) {
    super('POKEMON_NOT_FOUND', `Pokemon not found for dexId: ${dexId}`);
    this.name = 'PokemonNotFoundError';
  }
}

export class InvalidDexIdError extends PokemonDomainError {
  constructor(raw: unknown) {
    super('INVALID_DEX_ID', `Invalid dexId: ${String(raw)}`);
    this.name = 'InvalidDexIdError';
  }
}

export class InvalidPokemonTypeError extends PokemonDomainError {
  constructor(raw: string) {
    super('INVALID_POKEMON_TYPE', `Invalid pokemon type: ${raw}`);
    this.name = 'InvalidPokemonTypeError';
  }
}

export class InvalidBaseStatsError extends PokemonDomainError {
  constructor(message: string) {
    super('INVALID_BASE_STATS', message);
    this.name = 'InvalidBaseStatsError';
  }
}
