import { Module } from '@nestjs/common';
import { WORLD_MAP_REPOSITORY } from './domain/repositories/world-map.repository.js';
import { FileWorldMapRepository } from './infrastructure/maps/file-world-map.repository.js';
import { InstanceManager } from './application/services/instance-manager.service.js';
import { SessionManager } from './application/services/session-manager.service.js';
import { EnterWorldUseCase } from './application/use-cases/enter-world.use-case.js';
import { LeaveWorldUseCase } from './application/use-cases/leave-world.use-case.js';
import { MoveEntityUseCase } from './application/use-cases/move-entity.use-case.js';
import { GetWorldSnapshotUseCase } from './application/use-cases/get-world-snapshot.use-case.js';
import { ResolveLaboratorySpawnUseCase } from './application/use-cases/resolve-laboratory-spawn.use-case.js';

@Module({
  providers: [
    {
      provide: WORLD_MAP_REPOSITORY,
      useClass: FileWorldMapRepository,
    },
    InstanceManager,
    SessionManager,
    EnterWorldUseCase,
    LeaveWorldUseCase,
    MoveEntityUseCase,
    GetWorldSnapshotUseCase,
    ResolveLaboratorySpawnUseCase,
  ],
  exports: [
    WORLD_MAP_REPOSITORY,
    InstanceManager,
    SessionManager,
    EnterWorldUseCase,
    LeaveWorldUseCase,
    MoveEntityUseCase,
    GetWorldSnapshotUseCase,
    ResolveLaboratorySpawnUseCase,
  ],
})
export class WorldModule {}
