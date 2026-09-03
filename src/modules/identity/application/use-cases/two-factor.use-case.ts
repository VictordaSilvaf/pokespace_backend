import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type {
  ConfirmTwoFactorCommand,
  DisableTwoFactorCommand,
  SetupTwoFactorCommand,
  SetupTwoFactorResult,
  VerifyTwoFactorLoginCommand,
  AuthResult,
} from '../dto/auth.dto.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import {
  InvalidTwoFactorCodeError,
  TwoFactorAlreadyEnabledError,
  TwoFactorNotEnabledError,
  UserNotFoundError,
} from '../../domain/errors/identity.errors.js';
import {
  buildTotpUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '../services/totp.service.js';
import {
  TEMP_AUTH_STORE,
  type TempAuthStore,
} from '../ports/temp-auth-store.port.js';
import { AuthTokenIssuer } from '../services/auth-token-issuer.service.js';

@Injectable()
export class SetupTwoFactorUseCase
  implements UseCase<SetupTwoFactorCommand, SetupTwoFactorResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: SetupTwoFactorCommand): Promise<SetupTwoFactorResult> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledError();
    }

    const secret = generateTotpSecret();
    user.setTotpSecret(encryptTotpSecret(secret));
    await this.users.update(user);

    return {
      secret,
      otpauthUri: buildTotpUri(secret, user.username.value),
    };
  }
}

@Injectable()
export class ConfirmTwoFactorUseCase
  implements UseCase<ConfirmTwoFactorCommand, { message: string }>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: ConfirmTwoFactorCommand): Promise<{ message: string }> {
    const user = await this.users.findById(command.userId);
    if (!user || !user.totpSecret) {
      throw new UserNotFoundError(command.userId);
    }

    const secret = decryptTotpSecret(user.totpSecret);
    if (!verifyTotpCode(secret, command.code)) {
      throw new InvalidTwoFactorCodeError();
    }

    user.enableTwoFactor();
    await this.users.update(user);

    return { message: 'Two-factor authentication enabled' };
  }
}

@Injectable()
export class DisableTwoFactorUseCase
  implements UseCase<DisableTwoFactorCommand, { message: string }>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: DisableTwoFactorCommand): Promise<{ message: string }> {
    const user = await this.users.findById(command.userId);
    if (!user || !user.totpSecret) {
      throw new TwoFactorNotEnabledError();
    }

    const secret = decryptTotpSecret(user.totpSecret);
    if (!verifyTotpCode(secret, command.code)) {
      throw new InvalidTwoFactorCodeError();
    }

    user.disableTwoFactor();
    await this.users.update(user);

    return { message: 'Two-factor authentication disabled' };
  }
}

@Injectable()
export class VerifyTwoFactorLoginUseCase
  implements UseCase<VerifyTwoFactorLoginCommand, AuthResult>
{
  constructor(
    @Inject(TEMP_AUTH_STORE)
    private readonly tempAuth: TempAuthStore,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly tokenIssuer: AuthTokenIssuer,
  ) {}

  async execute(command: VerifyTwoFactorLoginCommand): Promise<AuthResult> {
    const userId = await this.tempAuth.consume(command.tempToken);
    if (!userId) {
      throw new InvalidTwoFactorCodeError();
    }

    const user = await this.users.findById(userId);
    if (!user?.totpSecret) {
      throw new UserNotFoundError(userId);
    }

    const secret = decryptTotpSecret(user.totpSecret);
    if (!verifyTotpCode(secret, command.code)) {
      throw new InvalidTwoFactorCodeError();
    }

    return this.tokenIssuer.issueForUser(
      {
        userId: user.id,
        email: user.email.value,
        phone: user.phone.value,
        username: user.username.value,
      },
      { metadata: command.metadata },
    );
  }
}
