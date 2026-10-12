import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ItemService } from './item.service';
import { CreateItemDto, ItemResponseDto } from './item.dto';

@Controller('houses/:houseId/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemService.create(houseId, dto);
  }
}
