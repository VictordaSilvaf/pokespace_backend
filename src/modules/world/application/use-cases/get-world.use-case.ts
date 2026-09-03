import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  WORLD_REPOSITORY,
  type WorldRepository,
} from '../../domain/repositories/world.repository.js';
import { WorldNotFoundError } from '../../domain/errors/world.errors.js';
import {
  toWorldResult,
  type GetWorldQuery,
  type WorldResult,
} from '../dto/world.dto.js';

@Injectable()
export class GetWorldUseCase implements UseCase<GetWorldQuery, WorldResult> {
  constructor(
    @Inject(WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
  ) {}

  async execute(query: GetWorldQuery): Promise<WorldResult> {
    const world = await this.worlds.findById(query.worldId);
    if (!world) {
      throw new WorldNotFoundError(query.worldId);
    }

    return toWorldResult(world);
  }
}