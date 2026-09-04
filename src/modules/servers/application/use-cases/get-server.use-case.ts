import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  SERVER_REPOSITORY,
  type ServerRepository,
} from '../../domain/repositories/server.repository.js';
import { ServerNotFoundError } from '../../domain/errors/server.errors.js';
import {
  toServerResult,
  type GetServerQuery,
  type ServerResult,
} from '../dto/server.dto.js';

@Injectable()
export class GetServerUseCase implements UseCase<GetServerQuery, ServerResult> {
  constructor(
    @Inject(SERVER_REPOSITORY)
    private readonly servers: ServerRepository,
  ) {}

  async execute(query: GetServerQuery): Promise<ServerResult> {
    const server = await this.servers.findById(query.serverId);
    if (!server) {
      throw new ServerNotFoundError(query.serverId);
    }

    return toServerResult(server);
  }
}