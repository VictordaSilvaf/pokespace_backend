import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  SERVER_REPOSITORY,
  type ServerRepository,
} from '../../domain/repositories/server.repository.js';
import { toServerResult, type ListServersResult } from '../dto/server.dto.js';

@Injectable()
export class ListServersUseCase implements UseCase<void, ListServersResult> {
    constructor (
        @Inject(SERVER_REPOSITORY)
        private readonly serverRepository: ServerRepository,
    ) {}

    async execute(): Promise<ListServersResult> {
        const servers = await this.serverRepository.list();
        return servers.map(toServerResult);
    }
}