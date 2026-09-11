import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserService } from './user.service';
import { FirebaseService } from '../../integrations/firebase/firebase.service';
import { House } from '../house/house.entity';
import { User } from './user.entity';
import { CreateAdminUserDto } from './user.dto';

// firebase-admin/auth pulls in the ESM-only `jose` package transitively,
// which Jest cannot parse — stub the module so it's never actually loaded.
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
    save: jest.Mock;
  };
}

describe('UserService', () => {
  let service: UserService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: MockQueryRunner;
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

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as unknown as jest.Mocked<DataSource>;

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
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('createAdminWithHouse', () => {
    it('should create the firebase account, the house, and the admin user inside a transaction', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({
          id: 'house-uuid',
          name: 'Casa da Ana',
          imagePath: null,
        })
        .mockResolvedValueOnce({
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
      expect(mockQueryRunner.manager.save).toHaveBeenNthCalledWith(1, House, {
        name: 'Casa da Ana',
        imagePath: null,
      });
      expect(mockQueryRunner.manager.save).toHaveBeenNthCalledWith(
        2,
        User,
        expect.objectContaining({
          firebaseUid: 'firebase-uid',
          isAdmin: true,
          houseId: 'house-uuid',
        }),
      );
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
        house: { id: 'house-uuid', name: 'Casa da Ana', imagePath: null },
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
    });

    it('should roll back the transaction and delete the firebase account when persisting fails', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      const dbError = new Error('db is down');
      mockQueryRunner.manager.save.mockRejectedValue(dbError);

      await expect(service.createAdminWithHouse(createDto)).rejects.toThrow(
        dbError,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockFirebaseAuth.deleteUser).toHaveBeenCalledWith('firebase-uid');
    });

    it('should translate a unique-constraint violation into a generic ConflictException', async () => {
      mockFirebaseAuth.createUser.mockResolvedValue({ uid: 'firebase-uid' });
      mockQueryRunner.manager.save.mockRejectedValue({ code: '23505' });

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
      mockQueryRunner.manager.save.mockRejectedValue(dbError);
      mockFirebaseAuth.deleteUser.mockRejectedValue(new Error('firebase down'));

      await expect(service.createAdminWithHouse(createDto)).rejects.toThrow(
        dbError,
      );
    });
  });
});
