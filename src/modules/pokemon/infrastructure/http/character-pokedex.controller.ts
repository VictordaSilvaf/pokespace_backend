import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../identity/infrastructure/http/auth.guard.js';
import { CurrentUser } from '../../../identity/infrastructure/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../identity/application/dto/auth.dto.js';
import { GetCharacterPokedexUseCase } from '../../application/use-cases/get-character-pokedex.use-case.js';
import { GetCharacterPokedexEntryUseCase } from '../../application/use-cases/pokedex-progress.use-cases.js';
import {
  CharacterAccessDeniedError,
  CharacterDomainError,
  CharacterNotFoundError,
} from '../../../character/domain/errors/character.errors.js';
import {
  PokemonDomainError,
  PokemonNotFoundError,
} from '../../domain/errors/pokemon.errors.js';

@ApiTags('pokedex')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('characters')
export class CharacterPokedexController {
  constructor(
    private readonly getPokedex: GetCharacterPokedexUseCase,
    private readonly getEntry: GetCharacterPokedexEntryUseCase,
  ) {}

  @Get(':id/pokedex')
  @ApiOperation({ summary: 'Get Pokédex progress for a character you own' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    try {
      return await this.getPokedex.execute({
        characterId: id,
        accountId: user.userId,
      });
    } catch (error) {
      this.mapError(error);
    }
  }

  @Get(':id/pokedex/:dexId')
  @ApiOperation({ summary: 'Get a single Pokédex entry for a character' })
  async one(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('dexId', new ParseIntPipe({ errorHttpStatusCode: 400 }))
    dexId: number,
  ) {
    try {
      return await this.getEntry.execute({
        characterId: id,
        accountId: user.userId,
        dexId,
      });
    } catch (error) {
      this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (
      error instanceof CharacterNotFoundError ||
      error instanceof PokemonNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof CharacterAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }
    if (
      error instanceof CharacterDomainError ||
      error instanceof PokemonDomainError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
