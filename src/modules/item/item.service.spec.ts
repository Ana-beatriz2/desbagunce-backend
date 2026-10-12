import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ItemService } from './item.service';
import { HouseService } from '../house/house.service';
import { Item } from './item.entity';
import { ItemEvent } from './item-event.entity';
import { ItemEventType, ItemStatus, ItemUnit } from './item.enums';
import { CreateItemDto } from './item.dto';

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: {
    withRepository: jest.Mock;
  };
}

const HOUSE_ID = 'house-uuid';
const TODAY = new Date('2026-10-11T12:00:00Z');

describe('ItemService', () => {
  let service: ItemService;
  let mockQueryRunner: MockQueryRunner;
  let mockItemRepository: { save: jest.Mock };
  let mockItemEventRepository: { save: jest.Mock };
  let transactionalItemRepository: { save: jest.Mock };
  let transactionalItemEventRepository: { save: jest.Mock };
  let mockHouseService: { exists: jest.Mock };

  beforeEach(async () => {
    mockItemRepository = { save: jest.fn() };
    mockItemEventRepository = { save: jest.fn() };
    // Echo what was saved back, plus a generated id, like TypeORM does
    transactionalItemRepository = {
      save: jest.fn((item) => Promise.resolve({ id: 'item-uuid', ...item })),
    };
    transactionalItemEventRepository = {
      save: jest.fn((event) => Promise.resolve({ id: 'event-uuid', ...event })),
    };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        withRepository: jest.fn((repository) =>
          repository === mockItemRepository
            ? transactionalItemRepository
            : transactionalItemEventRepository,
        ),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as unknown as DataSource;

    mockHouseService = { exists: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: getRepositoryToken(Item), useValue: mockItemRepository },
        {
          provide: getRepositoryToken(ItemEvent),
          useValue: mockItemEventRepository,
        },
        { provide: HouseService, useValue: mockHouseService },
      ],
    }).compile();

    service = module.get<ItemService>(ItemService);

    jest.useFakeTimers({ now: TODAY });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    const riceDto: CreateItemDto = {
      name: 'Arroz',
      unit: ItemUnit.KG,
      currentQuantity: 5,
      estimatedDurationDays: 30,
    };

    it('should create the item with an estimate derived from the informed duration', async () => {
      const result = await service.create(HOUSE_ID, riceDto);

      expect(mockHouseService.exists).toHaveBeenCalledWith(HOUSE_ID);
      expect(transactionalItemRepository.save).toHaveBeenCalledWith({
        name: 'Arroz',
        notes: null,
        photoPath: null,
        unit: ItemUnit.KG,
        currentQuantity: 5,
        status: ItemStatus.IN_STOCK,
        dailyConsumption: 0.1667,
        estimatedDepletionDate: '2026-11-10',
        houseId: HOUSE_ID,
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'item-uuid',
        name: 'Arroz',
        notes: null,
        photoPath: null,
        unit: ItemUnit.KG,
        status: ItemStatus.IN_STOCK,
        currentQuantity: 5,
        dailyConsumption: 0.1667,
        estimatedDepletionDate: '2026-11-10',
        houseId: HOUSE_ID,
      });
    });

    it('should record a "created" event in the same transaction', async () => {
      await service.create(HOUSE_ID, riceDto);

      expect(transactionalItemEventRepository.save).toHaveBeenCalledWith({
        type: ItemEventType.CREATED,
        quantityChange: 5,
        quantityAfter: 5,
        details: { estimatedDurationDays: 30 },
        itemId: 'item-uuid',
        houseId: HOUSE_ID,
        userId: null,
      });
      expect(mockItemRepository.save).not.toHaveBeenCalled();
      expect(mockItemEventRepository.save).not.toHaveBeenCalled();
    });

    it('should accept fractional quantities for items tracked in kg', async () => {
      const result = await service.create(HOUSE_ID, {
        ...riceDto,
        currentQuantity: 2.5,
      });

      expect(result.currentQuantity).toBe(2.5);
    });

    it('should reject fractional quantities for items counted in units', async () => {
      await expect(
        service.create(HOUSE_ID, {
          name: 'Detergente',
          unit: ItemUnit.UNIT,
          currentQuantity: 1.5,
          estimatedDurationDays: 15,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the house does not exist', async () => {
      mockHouseService.exists.mockResolvedValue(false);

      await expect(service.create(HOUSE_ID, riceDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('should mark the item as out of stock with no estimate when created with zero quantity', async () => {
      const result = await service.create(HOUSE_ID, {
        ...riceDto,
        currentQuantity: 0,
      });

      expect(result).toMatchObject({
        status: ItemStatus.OUT_OF_STOCK,
        dailyConsumption: null,
        estimatedDepletionDate: null,
      });
      // The informed duration is still kept in the history
      expect(transactionalItemEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ details: { estimatedDurationDays: 30 } }),
      );
    });

    it('should mark a unit item with a single unit left as running low', async () => {
      const result = await service.create(HOUSE_ID, {
        name: 'Detergente',
        unit: ItemUnit.UNIT,
        currentQuantity: 1,
        estimatedDurationDays: 15,
      });

      expect(result.status).toBe(ItemStatus.RUNNING_LOW);
    });

    it('should mark an item that lasts only a few days as running low', async () => {
      const result = await service.create(HOUSE_ID, {
        name: 'Pão',
        unit: ItemUnit.KG,
        currentQuantity: 0.5,
        estimatedDurationDays: 2,
      });

      expect(result.status).toBe(ItemStatus.RUNNING_LOW);
    });

    it('should roll back the item when recording the event fails', async () => {
      const dbError = new Error('db is down');
      transactionalItemEventRepository.save.mockRejectedValue(dbError);

      await expect(service.create(HOUSE_ID, riceDto)).rejects.toThrow(dbError);

      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
