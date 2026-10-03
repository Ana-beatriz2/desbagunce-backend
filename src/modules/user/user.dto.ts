import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateHouseDto, HouseResponseDto } from '../house/house.dto';

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
  @Type(() => CreateHouseDto)
  house: CreateHouseDto;
}

export interface CreateAdminUserResponseDto {
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    houseId: string;
  };
  house: HouseResponseDto;
}
