import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCharacterRequestDto {
  @ApiProperty({ example: 'Ash' })
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  serverId!: string;
}
