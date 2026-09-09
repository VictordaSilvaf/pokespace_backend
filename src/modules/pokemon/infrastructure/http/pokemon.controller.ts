import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListPokemonUseCase } from '../../application/use-cases/list-pokemon.use-case.js';
import { GetPokemonByDexIdUseCase } from '../../application/use-cases/get-pokemon-by-dex-id.use-case.js';
import {
  PokemonDomainError,
  PokemonNotFoundError,
} from '../../domain/errors/pokemon.errors.js';

@ApiTags('pokemon')
@Controller('pokemon')
export class PokemonController {
  constructor(
    private readonly listPokemon: ListPokemonUseCase,
    private readonly getPokemonByDexId: GetPokemonByDexIdUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active Pokémon (paginated, filterable)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async list(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.listPokemon.execute({
      q,
      type,
      limit: limit != null ? Number(limit) : undefined,
      offset: offset != null ? Number(offset) : undefined,
    });
  }

  @Get(':dexId')
  @ApiOperation({
    summary:
      'Get Pokémon by National Dex id (includes visual assets when registered)',
  })
  async getByDexId(
    @Param('dexId', new ParseIntPipe({ errorHttpStatusCode: 400 }))
    dexId: number,
  ) {
    try {
      return await this.getPokemonByDexId.execute({ dexId });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    if (error instanceof PokemonNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof PokemonDomainError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
