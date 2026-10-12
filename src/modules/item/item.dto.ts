import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ItemStatus, ItemUnit } from './item.enums';

const MAX_QUANTITY = 9_999_999.999;
const MAX_ESTIMATED_DURATION_DAYS = 3650;

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  photoPath?: string;

  @IsEnum(ItemUnit)
  unit: ItemUnit;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(MAX_QUANTITY)
  currentQuantity: number;

  @IsInt()
  @Min(1)
  @Max(MAX_ESTIMATED_DURATION_DAYS)
  estimatedDurationDays: number;
}

export interface ItemResponseDto {
  id: string;
  name: string;
  notes: string | null;
  photoPath: string | null;
  unit: ItemUnit;
  status: ItemStatus;
  currentQuantity: number;
  dailyConsumption: number | null;
  estimatedDepletionDate: string | null;
  houseId: string;
}
