import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../identity/infrastructure/http/auth.guard.js';
import { CurrentUser } from '../../../identity/infrastructure/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../identity/application/dto/auth.dto.js';
import { StartWildBattleUseCase } from '../../application/use-cases/start-wild-battle.use-case.js';
import { ExecuteBattleActionUseCase } from '../../application/use-cases/execute-battle-action.use-case.js';
import {
  BattleDomainError,
  BattleNotFoundError,
} from '../../domain/errors/battle.errors.js';
import { PokemonDomainError } from '../../../pokemon/domain/errors/pokemon.errors.js';
import {
  CharacterAccessDeniedError,
  CharacterDomainError,
  CharacterNotFoundError,
} from '../../../character/domain/errors/character.errors.js';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

class StartWildBattleDto {
  @IsUUID('4')
  characterId!: string;

  @IsInt()
  @Min(1)
  playerDexId!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  playerLevel!: number;

  @IsInt()
  @Min(1)
  wildDexId!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  wildLevel!: number;

  @IsOptional()
  @IsString()
  wildEntityId?: string;
}

class BattleActionDto {
  @IsUUID('4')
  characterId!: string;

  @IsIn(['move', 'capture', 'flee'])
  action!: 'move' | 'capture' | 'flee';

  @IsOptional()
  @IsString()
  moveId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ballBonus?: number;
}

@ApiTags('battle')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('battles')
export class BattleController {
  constructor(
    private readonly startWild: StartWildBattleUseCase,
    private readonly executeAction: ExecuteBattleActionUseCase,
  ) {}

  @Post('wild')
  @ApiOperation({ summary: 'Start a wild encounter battle context' })
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: StartWildBattleDto,
  ) {
    try {
      return await this.startWild.execute({
        accountId: user.userId,
        characterId: body.characterId,
        playerDexId: body.playerDexId,
        playerLevel: body.playerLevel,
        wildDexId: body.wildDexId,
        wildLevel: body.wildLevel,
        wildEntityId: body.wildEntityId,
      });
    } catch (error) {
      this.mapError(error);
    }
  }

  @Post(':battleId/actions')
  @ApiOperation({ summary: 'Execute move / capture / flee in an active battle' })
  async action(
    @CurrentUser() user: AuthenticatedUser,
    @Param('battleId', new ParseUUIDPipe({ version: '4' })) battleId: string,
    @Body() body: BattleActionDto,
  ) {
    try {
      return await this.executeAction.execute({
        battleId,
        accountId: user.userId,
        characterId: body.characterId,
        action: body.action,
        moveId: body.moveId,
        ballBonus: body.ballBonus,
      });
    } catch (error) {
      this.mapError(error);
    }
  }

  private mapError(error: unknown): never {
    if (error instanceof BattleNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof CharacterNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof CharacterAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }
    if (
      error instanceof BattleDomainError ||
      error instanceof PokemonDomainError ||
      error instanceof CharacterDomainError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
