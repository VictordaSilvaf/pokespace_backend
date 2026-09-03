import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../domain/repositories/world.repository.js';
import { toWorldResult, type ListWorldsResult } from '../dto/world.dto.js';

@Injectable()
export class ListWorldsUseCase implements UseCase<void, ListWorldsResult> {
    constructor (
        @Inject(WORLD_REPOSITORY)
        private readonly worldRepository: WorldRepository,
    ) {}

    async execute(): Promise<ListWorldsResult> {
        const worlds = await this.worldRepository.list();
        return worlds.map(toWorldResult);
    }
}