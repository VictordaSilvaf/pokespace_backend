import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { Inject } from '@nestjs/common';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('characters')
export class CharacterController {
  constructor(
    private readonly createCharacter: CreateCharacterUseCase,
    private readonly getCharacter: GetCharacterForAccountUseCase,
    @Inject(CHARACTER_REPOSITORY)
    private readonly characters: CharacterRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a character and receive laboratory spawn' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCharacterRequestDto,
  ) {
    try {
      return await this.createCharacter.execute({
        accountId: user.userId,
        serverId: body.serverId,
        name: body.name,
      });
    } catch (error) {
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

  private mapDomainError(error: unknown): never {
    if (error instanceof CharacterNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof CharacterAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }
    if (
      error instanceof CharacterNameTakenError ||
      error instanceof CharacterLimitReachedError ||
      error instanceof ServerNotJoinableError ||
      error instanceof CharacterDomainError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
