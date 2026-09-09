import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetMapMetadataUseCase } from '../../application/use-cases/get-map-metadata.use-case.js';
import {
  MapNotFoundError,
  WorldDomainError,
} from '../../domain/errors/world.errors.js';

@ApiTags('maps')
@Controller('maps')
export class MapController {
  constructor(private readonly getMapMetadata: GetMapMetadataUseCase) {}

  @Get(':mapId')
  @ApiOperation({ summary: 'Get map metadata (tilesets, chunks, spawn zones)' })
  async getById(@Param('mapId') mapId: string) {
    try {
      return await this.getMapMetadata.execute({ mapId });
    } catch (error) {
      if (error instanceof MapNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof WorldDomainError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
