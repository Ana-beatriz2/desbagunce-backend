import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAdminHouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  imagePath?: string;
}

export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @ValidateNested()
  @Type(() => CreateAdminHouseDto)
  house: CreateAdminHouseDto;
}

export interface CreateAdminUserResponseDto {
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    houseId: string;
  };
  house: {
    id: string;
    name: string;
    imagePath: string | null;
  };
}
