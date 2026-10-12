import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HouseService } from '../house/house.service';
import { Item } from './item.entity';
import { ItemEvent } from './item-event.entity';
import { ItemEventType, ItemStatus, ItemUnit } from './item.enums';
import { CreateItemDto, ItemResponseDto } from './item.dto';

// An item is "running low" once its remaining days fall to the larger of
// these: a fixed floor, or a share of how long a full stock lasts
const RUNNING_LOW_MIN_DAYS = 3;
const RUNNING_LOW_CYCLE_RATIO = 0.25;
const DAILY_CONSUMPTION_DECIMALS = 4;

interface StockEstimate {
  status: ItemStatus;
  dailyConsumption: number | null;
  estimatedDepletionDate: string | null;
}

interface StatusInput {
  unit: ItemUnit;
  quantity: number;
  daysUntilDepletion: number | null;
  cycleDays: number | null;
}

@Injectable()
export class ItemService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(ItemEvent)
    private readonly itemEventRepository: Repository<ItemEvent>,
    private readonly houseService: HouseService,
  ) {}

  async create(houseId: string, dto: CreateItemDto): Promise<ItemResponseDto> {
    await this.ensureHouseExists(houseId);
    this.ensureQuantityMatchesUnit(dto.unit, dto.currentQuantity);

    const estimate = this.buildInitialEstimate(dto);
    return this.persistItemWithCreatedEvent(houseId, dto, estimate);
  }

  private async ensureHouseExists(houseId: string): Promise<void> {
    const houseExists = await this.houseService.exists(houseId);
    if (!houseExists) {
      throw new NotFoundException(`House with ID ${houseId} not found`);
    }
  }

  private ensureQuantityMatchesUnit(unit: ItemUnit, quantity: number): void {
    if (unit === ItemUnit.UNIT && !Number.isInteger(quantity)) {
      throw new BadRequestException(
        'Items counted in units must have a whole-number quantity',
      );
    }
  }

  private buildInitialEstimate(dto: CreateItemDto): StockEstimate {
    const { unit, currentQuantity, estimatedDurationDays } = dto;
    // An item created already out of stock has nothing left to deplete
    const durationDays = currentQuantity > 0 ? estimatedDurationDays : null;

    const status = this.calculateStatus({
      unit,
      quantity: currentQuantity,
      daysUntilDepletion: durationDays,
      cycleDays: durationDays,
    });

    if (durationDays === null) {
      return { status, dailyConsumption: null, estimatedDepletionDate: null };
    }

    return {
      status,
      dailyConsumption: this.round(
        currentQuantity / durationDays,
        DAILY_CONSUMPTION_DECIMALS,
      ),
      estimatedDepletionDate: this.addDaysToToday(durationDays),
    };
  }

  private calculateStatus(input: StatusInput): ItemStatus {
    const { unit, quantity, daysUntilDepletion, cycleDays } = input;

    if (quantity <= 0) {
      return ItemStatus.OUT_OF_STOCK;
    }
    if (daysUntilDepletion !== null && daysUntilDepletion <= 0) {
      return ItemStatus.PROBABLY_OUT;
    }
    if (unit === ItemUnit.UNIT && quantity <= 1) {
      return ItemStatus.RUNNING_LOW;
    }
    if (daysUntilDepletion !== null && cycleDays !== null) {
      const threshold = Math.max(
        RUNNING_LOW_MIN_DAYS,
        cycleDays * RUNNING_LOW_CYCLE_RATIO,
      );
      if (daysUntilDepletion <= threshold) {
        return ItemStatus.RUNNING_LOW;
      }
    }
    return ItemStatus.IN_STOCK;
  }

  private async persistItemWithCreatedEvent(
    houseId: string,
    dto: CreateItemDto,
    estimate: StockEstimate,
  ): Promise<ItemResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager
        .withRepository(this.itemRepository)
        .save({
          name: dto.name,
          notes: dto.notes ?? null,
          photoPath: dto.photoPath ?? null,
          unit: dto.unit,
          currentQuantity: dto.currentQuantity,
          ...estimate,
          houseId,
        });

      await queryRunner.manager.withRepository(this.itemEventRepository).save({
        type: ItemEventType.CREATED,
        quantityChange: dto.currentQuantity,
        quantityAfter: dto.currentQuantity,
        details: { estimatedDurationDays: dto.estimatedDurationDays },
        itemId: item.id,
        houseId,
        userId: null,
      });

      await queryRunner.commitTransaction();

      return this.mapToResponseDto(item);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private addDaysToToday(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private mapToResponseDto(item: Item): ItemResponseDto {
    return {
      id: item.id,
      name: item.name,
      notes: item.notes,
      photoPath: item.photoPath,
      unit: item.unit,
      status: item.status,
      currentQuantity: item.currentQuantity,
      dailyConsumption: item.dailyConsumption,
      estimatedDepletionDate: item.estimatedDepletionDate,
      houseId: item.houseId,
    };
  }
}
