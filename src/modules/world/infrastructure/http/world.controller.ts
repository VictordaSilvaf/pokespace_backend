import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetWorldUseCase } from '../../application/use-cases/get-world.use-case.js';
import { ListWorldsUseCase } from '../../application/use-cases/list-worlds.use-case.js';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  WorldDomainError,
  WorldNotFoundError,
} from '../../domain/errors/world.errors.js';
import { translateDomainError } from '../../../../shared/infrastructure/i18n/translate.js';

@ApiTags('worlds')
@Controller('worlds')
export class WorldController {
  constructor(
    private readonly listWorlds: ListWorldsUseCase,
    private readonly getWorld: GetWorldUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all worlds' })
  async list() {
    return this.listWorlds.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a world by id' })
  async getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    try {
      return await this.getWorld.execute({ worldId: id });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    if (error instanceof WorldNotFoundError) {
      throw new NotFoundException(translateDomainError(error, 'world'));
    }
    if (error instanceof WorldDomainError) {
      throw new BadRequestException(translateDomainError(error, 'world'));
    }
    throw error;
  }
}
