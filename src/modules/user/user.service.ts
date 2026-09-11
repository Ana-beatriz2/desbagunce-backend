import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FirebaseService } from '../../integrations/firebase/firebase.service';
import { House } from '../house/house.entity';
import { User } from './user.entity';
import { CreateAdminUserDto, CreateAdminUserResponseDto } from './user.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

// Deliberately vague: naming "email" specifically here would let an attacker
// enumerate which addresses already have an account (CWE-203).
const SIGNUP_CONFLICT_MESSAGE =
  'Não foi possível concluir o cadastro com os dados informados.';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createAdminWithHouse(
    dto: CreateAdminUserDto,
  ): Promise<CreateAdminUserResponseDto> {
    const firebaseUid = await this.createFirebaseAccount(dto);

    try {
      return await this.persistAdminAndHouse(dto, firebaseUid);
    } catch (error) {
      await this.rollbackFirebaseAccount(firebaseUid);
      throw error;
    }
  }

  private async createFirebaseAccount(
    dto: CreateAdminUserDto,
  ): Promise<string> {
    try {
      const firebaseUser = await this.firebaseService.getAuth().createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.name,
      });
      return firebaseUser.uid;
    } catch (error) {
      if (this.getErrorCode(error) === 'auth/email-already-exists') {
        this.logger.warn(
          `Signup rejected: email already has a Firebase account (${dto.email})`,
        );
        throw new ConflictException(SIGNUP_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  private async persistAdminAndHouse(
    dto: CreateAdminUserDto,
    firebaseUid: string,
  ): Promise<CreateAdminUserResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const house = await queryRunner.manager.save(House, {
        name: dto.house.name,
        imagePath: dto.house.imagePath ?? null,
      });

      const user = await queryRunner.manager.save(User, {
        name: dto.name,
        email: dto.email,
        firebaseUid,
        isAdmin: true,
        houseId: house.id,
      });

      await queryRunner.commitTransaction();

      return this.mapToResponseDto(user, house);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw this.translatePersistenceError(error, dto.email);
    } finally {
      await queryRunner.release();
    }
  }

  private translatePersistenceError(error: unknown, email: string): unknown {
    if (this.getErrorCode(error) === POSTGRES_UNIQUE_VIOLATION) {
      this.logger.warn(
        `Signup rejected: email already has a User record (${email})`,
      );
      return new ConflictException(SIGNUP_CONFLICT_MESSAGE);
    }
    return error;
  }

  private async rollbackFirebaseAccount(firebaseUid: string): Promise<void> {
    try {
      await this.firebaseService.getAuth().deleteUser(firebaseUid);
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to roll back Firebase account ${firebaseUid} after a failed admin signup`,
        stack,
      );
    }
  }

  private getErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return (error as { code?: string }).code;
    }
    return undefined;
  }

  private mapToResponseDto(
    user: User,
    house: House,
  ): CreateAdminUserResponseDto {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        houseId: user.houseId,
      },
      house: {
        id: house.id,
        name: house.name,
        imagePath: house.imagePath,
      },
    };
  }
}
