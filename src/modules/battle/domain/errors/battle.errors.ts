export class BattleDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BattleDomainError';
  }
}

export class BattleNotFoundError extends BattleDomainError {
  constructor(battleId: string) {
    super('BATTLE_NOT_FOUND', `Battle not found: ${battleId}`);
    this.name = 'BattleNotFoundError';
  }
}

export class BattleAlreadyFinishedError extends BattleDomainError {
  constructor(battleId: string) {
    super('BATTLE_FINISHED', `Battle already finished: ${battleId}`);
    this.name = 'BattleAlreadyFinishedError';
  }
}
