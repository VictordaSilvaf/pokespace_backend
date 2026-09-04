import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../identity/infrastructure/http/auth.guard.js';
import { CurrentUser } from '../../../identity/infrastructure/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../identity/application/dto/auth.dto.js';
import { CreateCharacterUseCase } from '../../application/use-cases/create-character.use-case.js';
import { GetCharacterForAccountUseCase } from '../../application/use-cases/get-character-for-account.use-case.js';
import { CreateCharacterRequestDto } from './dto/character-request.dto.js';
import {
  CharacterAccessDeniedError,
  CharacterDomainError,
  CharacterLimitReachedError,
  CharacterNameTakenError,
  CharacterNotFoundError,
  ServerNotJoinableError,
} from '../../domain/errors/character.errors.js';
import {
  CHARACTER_REPOSITORY,
  type CharacterRepository,
} from '../../domain/repositories/character.repository.js';
import { translateDomainError } from '../../../../shared/infrastructure/i18n/translate.js';
import { IdempotencyService } from '../../../idempotency/application/services/idempotency.service.js';
import { hashIdempotencyRequest } from '../../../idempotency/application/idempotency-hash.js';
import {
  IdempotencyDomainError,
  IdempotencyFailedReplayError,
  IdempotencyInProgressError,
  IdempotencyInvalidKeyError,
  IdempotencyKeyMismatchError,
} from '../../../idempotency/domain/errors/idempotency.errors.js';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('characters')
export class CharacterController {
  constructor(
    private readonly createCharacter: CreateCharacterUseCase,
    private readonly getCharacter: GetCharacterForAccountUseCase,
    private readonly idempotency: IdempotencyService,
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a character and receive laboratory spawn' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Optional key to make character creation safe against retries/duplicates',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCharacterRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    try {
      const command = {
        accountId: user.userId,
        serverId: body.serverId,
        name: body.name,
      };

      if (!idempotencyKey?.trim()) {
        return await this.createCharacter.execute(command);
      }

      return await this.idempotency.run({
        key: idempotencyKey.trim(),
        requestHash: hashIdempotencyRequest(command),
        execute: () => this.createCharacter.execute(command),
        mapFailure: (error) => ({
          message: error instanceof Error ? error.message : 'Unknown error',
          code:
            error instanceof CharacterDomainError
              ? error.code
              : error instanceof Error
                ? error.name
                : undefined,
        }),
      });
    } catch (error) {
      this.mapIdempotencyError(error);
      this.mapDomainError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List characters for the current account' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const list = await this.characters.listByAccountId(user.userId);
    return list.map((c) => ({
      id: c.id,
      name: c.name.value,
      serverId: c.serverId,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a character owned by the current account' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    try {
      return await this.getCharacter.execute({
        characterId: id,
        accountId: user.userId,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapIdempotencyError(error: unknown): void {
    if (!(error instanceof IdempotencyDomainError)) {
      return;
    }

    const message = translateDomainError(error, 'idempotency');

    if (error instanceof IdempotencyInProgressError) {
      throw new ConflictException(message);
    }
    if (
      error instanceof IdempotencyKeyMismatchError ||
      error instanceof IdempotencyInvalidKeyError
    ) {
      throw new BadRequestException(message);
    }
    if (error instanceof IdempotencyFailedReplayError) {
      throw new BadRequestException(message);
    }
    throw new BadRequestException(message);
  }

  private mapDomainError(error: unknown): never {
    const message =
      error instanceof CharacterDomainError
        ? translateDomainError(error, 'character')
        : undefined;

    if (error instanceof CharacterNotFoundError) {
      throw new NotFoundException(message ?? error.message);
    }
    if (error instanceof CharacterAccessDeniedError) {
      throw new ForbiddenException(message ?? error.message);
    }
    if (
      error instanceof CharacterNameTakenError ||
      error instanceof CharacterLimitReachedError ||
      error instanceof ServerNotJoinableError ||
      error instanceof CharacterDomainError
    ) {
      throw new BadRequestException(message ?? error.message);
    }
    throw error;
  }
}
