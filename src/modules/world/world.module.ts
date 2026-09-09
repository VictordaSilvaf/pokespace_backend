import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { WORLD_MAP_REPOSITORY } from './domain/repositories/world-map.repository.js';
import { FileWorldMapRepository } from './infrastructure/maps/file-world-map.repository.js';
import { InstanceManager } from './application/services/instance-manager.service.js';
import { SessionManager } from './application/services/session-manager.service.js';
import { WildSpawnService } from './application/services/wild-spawn.service.js';
import { NpcSpawnService } from './application/services/npc-spawn.service.js';
import { InterestAreaService } from './application/services/interest-area.service.js';
import { SharedWorldStateService } from './application/services/shared-world-state.service.js';
import { EncounterService } from './application/services/encounter.service.js';
import { EnterWorldUseCase } from './application/use-cases/enter-world.use-case.js';
import { LeaveWorldUseCase } from './application/use-cases/leave-world.use-case.js';
import { MoveEntityUseCase } from './application/use-cases/move-entity.use-case.js';
import { GetWorldSnapshotUseCase } from './application/use-cases/get-world-snapshot.use-case.js';
import { ResolveLaboratorySpawnUseCase } from './application/use-cases/resolve-laboratory-spawn.use-case.js';
import { GetMapMetadataUseCase } from './application/use-cases/get-map-metadata.use-case.js';
import { MapController } from './infrastructure/http/map.controller.js';

@Module({
  imports: [SharedModule],
  controllers: [MapController],
  providers: [
    {
      provide: WORLD_MAP_REPOSITORY,
      useClass: FileWorldMapRepository,
    },
    InstanceManager,
    SessionManager,
    WildSpawnService,
    NpcSpawnService,
    EncounterService,
    InterestAreaService,
    SharedWorldStateService,
    EnterWorldUseCase,
    LeaveWorldUseCase,
    MoveEntityUseCase,
    GetWorldSnapshotUseCase,
    ResolveLaboratorySpawnUseCase,
    GetMapMetadataUseCase,
  ],
  exports: [
    WORLD_MAP_REPOSITORY,
    InstanceManager,
    SessionManager,
    WildSpawnService,
    NpcSpawnService,
    EncounterService,
    InterestAreaService,
    SharedWorldStateService,
    EnterWorldUseCase,
    LeaveWorldUseCase,
    MoveEntityUseCase,
    GetWorldSnapshotUseCase,
    ResolveLaboratorySpawnUseCase,
    GetMapMetadataUseCase,
  ],
})
export class WorldModule {}
