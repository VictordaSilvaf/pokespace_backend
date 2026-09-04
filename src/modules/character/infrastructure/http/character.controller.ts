import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../../../identity/application/dto/auth.dto.js';
import { AuthGuard } from '../../../identity/infrastructure/http/auth.guard.js';
import { CurrentUser } from '../../../identity/infrastructure/http/current-user.decorator.js';
import {
  translateDomainError,
} from '../../../../shared/infrastructure/i18n/translate.js';
import {
  CharacterDomainError,
  CharacterLimitReachedError,
  CharacterNotFoundError,
  DisplayNameTakenError,
  InvalidStarterSkinError,
  WorldNotAvailableError,
} from '../../domain/errors/character.errors.js';
import { CreateCharacterUseCase } from '../../application/use-cases/create-character.use-case.js';
import { GetCharacterUseCase } from '../../application/use-cases/get-character.use-case.js';
import { GetCreationOptionsUseCase } from '../../application/use-cases/get-creation-options.use-case.js';
import { ListCharactersUseCase } from '../../application/use-cases/list-characters.use-case.js';
import { CreateCharacterRequestDto } from './dto/character-request.dto.js';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('characters')
export class CharacterController {
  constructor(
    private readonly listCharacters: ListCharactersUseCase,
    private readonly createCharacter: CreateCharacterUseCase,
    private readonly getCharacter: GetCharacterUseCase,
    private readonly getCreationOptions: GetCreationOptionsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List characters for the authenticated account' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.listCharacters.execute({ userId: user.userId });
  }

  @Get('creation-options')
  @ApiOperation({ summary: 'Worlds and starter skins available for creation' })
  async creationOptions() {
    return this.getCreationOptions.execute();
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a character (world is immutable)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCharacterRequestDto,
  ) {
    try {
      return await this.createCharacter.execute({
        userId: user.userId,
        worldId: body.worldId,
        displayName: body.displayName,
        skinId: body.skinId,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a character owned by the authenticated account' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    try {
      return await this.getCharacter.execute({
        userId: user.userId,
        characterId: id,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    const message =
      error instanceof CharacterDomainError
        ? translateDomainError(error, 'character')
        : error instanceof Error
          ? error.message
          : 'Unexpected error';

    if (
      error instanceof CharacterLimitReachedError ||
      error instanceof DisplayNameTakenError
    ) {
      throw new ConflictException(message);
    }

    if (error instanceof CharacterNotFoundError) {
      throw new NotFoundException(message);
    }

    if (
      error instanceof WorldNotAvailableError ||
      error instanceof InvalidStarterSkinError ||
      error instanceof CharacterDomainError
    ) {
      throw new BadRequestException(message);
    }

    throw error;
  }
}
