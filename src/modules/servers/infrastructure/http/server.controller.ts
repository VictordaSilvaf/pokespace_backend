import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetServerUseCase } from '../../application/use-cases/get-server.use-case.js';
import { ListServersUseCase } from '../../application/use-cases/list-servers.use-case.js';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ServerDomainError,
  ServerNotFoundError,
} from '../../domain/errors/server.errors.js';

@ApiTags('servers')
@Controller('servers')
export class ServerController {
  constructor(
    private readonly listServers: ListServersUseCase,
    private readonly getServer: GetServerUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all servers' })
  async list() {
    return this.listServers.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a server by id' })
  async getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    try {
      return await this.getServer.execute({ serverId: id });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): never {
    if (error instanceof ServerNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ServerDomainError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
