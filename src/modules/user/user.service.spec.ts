import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserService } from './user.service';
import { FirebaseService } from '../../integrations/firebase/firebase.service';
import { HouseService } from '../house/house.service';
import { User } from './user.entity';
import { CreateAdminUserDto } from './user.dto';

jest.mock('../../integrations/firebase/firebase.service', () => ({
  FirebaseService: jest.fn(),
}));

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

describe('UserService', () => {
  let service: UserService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: MockQueryRunner;
  let mockUserRepository: { save: jest.Mock };
  let mockTransactionalUserRepository: { save: jest.Mock };
  let mockHouseService: { create: jest.Mock };
  let mockFirebaseAuth: {
    createUser: jest.Mock;
    deleteUser: jest.Mock;
  };
  let mockFirebaseService: jest.Mocked<FirebaseService>;

  const createDto: CreateAdminUserDto = {
    name: 'Ana',
    email: 'ana@example.com',
    password: 'supersecret',
    house: { name: 'Casa da Ana' },
  };

  const houseResponse = {
    id: 'house-uuid',
    name: 'Casa da Ana',
    imagePath: null,
  };

  beforeEach(async () => {
    mockUserRepository = { save: jest.fn() };
    mockTransactionalUserRepository = { save: jest.fn() };

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        withRepository: jest
          .fn()
          .mockReturnValue(mockTransactionalUserRepository),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as unknown as jest.Mocked<DataSource>;

    mockHouseService = { create: jest.fn() };

    mockFirebaseAuth = {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    mockFirebaseService = {
      getAuth: jest.fn().mockReturnValue(mockFirebaseAuth),
    } as unknown as jest.Mocked<FirebaseService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: HouseService, useValue: mockHouseService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('createAdminWithHouse', () => {
    it('should create the firebase account, the house, and the admin user inside a transaction', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      mockHouseService.create.mockResolvedValue(houseResponse);
      mockTransactionalUserRepository.save.mockResolvedValue({
        id: 'user-uuid',
        name: 'Ana',
        email: 'ana@example.com',
        isAdmin: true,
        houseId: 'house-uuid',
      });

      const result = await service.createAdminWithHouse(createDto);

      expect(mockFirebaseAuth.createUser).toHaveBeenCalledWith({
        email: createDto.email,
        password: createDto.password,
        displayName: createDto.name,
      });
      // The house is created by HouseService, inside this transaction
      expect(mockHouseService.create).toHaveBeenCalledWith(
        createDto.house,
        mockQueryRunner.manager,
      );
      expect(mockQueryRunner.manager.withRepository).toHaveBeenCalledWith(
        mockUserRepository,
      );
      expect(mockTransactionalUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: 'firebase-uid',
          isAdmin: true,
          houseId: 'house-uuid',
        }),
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: 'user-uuid',
          name: 'Ana',
          email: 'ana@example.com',
          isAdmin: true,
          houseId: 'house-uuid',
        },
        house: houseResponse,
      });
    });

    it('should throw a generic ConflictException when the email is already registered in firebase', async () => {
      mockFirebaseAuth.createUser.mockRejectedValue({
        code: 'auth/email-already-exists',
      });

      let error: unknown;
      try {
        await service.createAdminWithHouse(createDto);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(ConflictException);
      // The message must not confirm the email exists — doing so lets an
      // attacker enumerate registered accounts (CWE-203).
      expect((error as ConflictException).message.toLowerCase()).not.toContain(
        'email',
      );
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
      expect(mockHouseService.create).not.toHaveBeenCalled();
    });

    it('should roll back the transaction and delete the firebase account when creating the house fails', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      const dbError = new Error('db is down');
      mockHouseService.create.mockRejectedValue(dbError);

      await expect(service.createAdminWithHouse(createDto)).rejects.toThrow(
        dbError,
      );

      expect(mockTransactionalUserRepository.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockFirebaseAuth.deleteUser).toHaveBeenCalledWith('firebase-uid');
    });

    it('should roll back the transaction and delete the firebase account when saving the user fails', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      mockHouseService.create.mockResolvedValue(houseResponse);
      const dbError = new Error('db is down');
      mockTransactionalUserRepository.save.mockRejectedValue(dbError);

      await expect(service.createAdminWithHouse(createDto)).rejects.toThrow(
        dbError,
      );

      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockFirebaseAuth.deleteUser).toHaveBeenCalledWith('firebase-uid');
    });

    it('should translate a unique-constraint violation into a generic ConflictException', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      mockHouseService.create.mockResolvedValue(houseResponse);
      mockTransactionalUserRepository.save.mockRejectedValue({ code: '23505' });

      let error: unknown;
      try {
        await service.createAdminWithHouse(createDto);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message.toLowerCase()).not.toContain(
        'email',
      );
      expect(mockFirebaseAuth.deleteUser).toHaveBeenCalledWith('firebase-uid');
    });

    it('should not fail the request when the firebase rollback itself fails', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      const dbError = new Error('db is down');
      mockHouseService.create.mockRejectedValue(dbError);
      mockFirebaseAuth.deleteUser.mockRejectedValue(new Error('firebase down'));

      await expect(service.createAdminWithHouse(createDto)).rejects.toThrow(
        dbError,
      );
    });
  });
});
