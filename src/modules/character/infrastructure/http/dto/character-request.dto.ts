import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCharacterRequestDto {
  @IsUUID('4')
  worldId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  skinId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(16)
  displayName!: string;
}
