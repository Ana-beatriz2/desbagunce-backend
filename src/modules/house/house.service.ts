import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { House } from './house.entity';
import { CreateHouseDto, HouseResponseDto } from './house.dto';

@Injectable()
export class HouseService {
  constructor(
    @InjectRepository(House)
    private readonly houseRepository: Repository<House>,
  ) {}

  async create(
    dto: CreateHouseDto,
    manager?: EntityManager,
  ): Promise<HouseResponseDto> {
    const repository = manager
      ? manager.withRepository(this.houseRepository)
      : this.houseRepository;

    const house = await repository.save({
      name: dto.name,
      imagePath: dto.imagePath ?? null,
    });

    return this.mapToResponseDto(house);
  }

  private mapToResponseDto(house: House): HouseResponseDto {
    return {
      id: house.id,
      name: house.name,
      imagePath: house.imagePath,
    };
  }
}
