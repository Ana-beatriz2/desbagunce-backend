import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateAdminUserDto, CreateAdminUserResponseDto } from './user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(
    @Body() dto: CreateAdminUserDto,
  ): Promise<CreateAdminUserResponseDto> {
    return this.userService.createAdminWithHouse(dto);
  }
}
