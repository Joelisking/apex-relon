import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPreferencesService } from './user-preferences.service';

class SetPreferenceDto {
  @IsNotEmpty()
  value: unknown;
}

interface AuthUser {
  id: string;
  role: string;
  email: string;
  name: string;
  status: string;
}

@Controller('user-preferences')
export class UserPreferencesController {
  constructor(private readonly service: UserPreferencesService) {}

  @Get(':key')
  async get(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    const value = await this.service.get(user.id, key);
    return { value };
  }

  @Put(':key')
  async set(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Body() dto: SetPreferenceDto,
  ) {
    await this.service.set(user.id, key, dto.value);
    return { ok: true };
  }

  @Delete(':key')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('key') key: string) {
    await this.service.delete(user.id, key);
  }
}
