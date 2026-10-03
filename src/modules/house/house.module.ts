import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { House } from './house.entity';
import { HouseService } from './house.service';

@Module({
  imports: [TypeOrmModule.forFeature([House])],
  providers: [HouseService],
  exports: [HouseService],
})
export class HouseModule {}
