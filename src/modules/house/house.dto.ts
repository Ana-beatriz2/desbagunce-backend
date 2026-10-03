import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  imagePath?: string;
}

export interface HouseResponseDto {
  id: string;
  name: string;
  imagePath: string | null;
}
