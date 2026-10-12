import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseModule } from '../house/house.module';
import { Item } from './item.entity';
import { ItemEvent } from './item-event.entity';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemEvent]), HouseModule],
  controllers: [ItemController],
  providers: [ItemService],
})
export class ItemModule {}
