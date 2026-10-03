import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { HouseService } from './house.service';
import { House } from './house.entity';

describe('HouseService', () => {
  let service: HouseService;
  let mockHouseRepository: { save: jest.Mock };

  beforeEach(async () => {
    mockHouseRepository = { save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HouseService,
        { provide: getRepositoryToken(House), useValue: mockHouseRepository },
      ],
    }).compile();

    service = module.get<HouseService>(HouseService);
  });

  describe('create', () => {
    it('should save the house with the default repository and return the response dto', async () => {
      mockHouseRepository.save.mockResolvedValue({
        id: 'house-uuid',
        name: 'Casa da Ana',
        imagePath: null,
        createdAt: new Date(),
      });

      const result = await service.create({ name: 'Casa da Ana' });

      expect(mockHouseRepository.save).toHaveBeenCalledWith({
        name: 'Casa da Ana',
        imagePath: null,
      });
      expect(result).toEqual({
        id: 'house-uuid',
        name: 'Casa da Ana',
        imagePath: null,
      });
    });

    it('should save through the given entity manager so it joins the caller transaction', async () => {
      const transactionalRepository = {
        save: jest.fn().mockResolvedValue({
          id: 'house-uuid',
          name: 'Casa da Ana',
          imagePath: 'houses/ana.png',
        }),
      };
      const withRepository = jest.fn().mockReturnValue(transactionalRepository);
      const manager = { withRepository } as unknown as EntityManager;

      const result = await service.create(
        { name: 'Casa da Ana', imagePath: 'houses/ana.png' },
        manager,
      );

      expect(withRepository).toHaveBeenCalledWith(mockHouseRepository);
      expect(transactionalRepository.save).toHaveBeenCalledWith({
        name: 'Casa da Ana',
        imagePath: 'houses/ana.png',
      });
      expect(mockHouseRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'house-uuid',
        name: 'Casa da Ana',
        imagePath: 'houses/ana.png',
      });
    });

    it('should propagate repository errors', async () => {
      const dbError = new Error('db is down');
      mockHouseRepository.save.mockRejectedValue(dbError);

      await expect(service.create({ name: 'Casa da Ana' })).rejects.toThrow(
        dbError,
      );
    });
  });
});
