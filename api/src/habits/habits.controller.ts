import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthUser } from '../auth/jwt-auth.guard.js';
import {
  ArchiveHabitDto,
  CreateCheckInDto,
  CreateHabitDto,
  UpdateHabitDto,
} from './dto/habit.dto.js';
import { HabitsService } from './habits.service.js';

/** Ca controller deu phai dang nhap moi goi duoc. */
@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.habits.findAll(user, includeArchived === 'true');
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHabitDto) {
    return this.habits.create(user, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.habits.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ) {
    return this.habits.update(user, id, dto);
  }

  @Patch(':id/archive')
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ArchiveHabitDto,
  ) {
    return this.habits.setArchived(user, id, dto.archived);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.habits.remove(user, id);
  }

  // ------------------------------------------------------------- check-in

  @Post(':id/check-in')
  checkIn(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCheckInDto,
  ) {
    return this.habits.checkIn(user, id, dto);
  }

  @Delete(':id/check-in')
  @HttpCode(204)
  removeCheckIn(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    return this.habits.removeCheckIn(user, id, date);
  }

  @Get(':id/check-ins')
  listCheckIns(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.habits.listCheckIns(user, id, from, to);
  }
}
