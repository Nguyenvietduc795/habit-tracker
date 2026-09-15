import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { HabitsController } from './habits.controller.js';
import { HabitsService } from './habits.service.js';

@Module({
  imports: [AuthModule], // can JwtAuthGuard + JwtService
  controllers: [HabitsController],
  providers: [HabitsService],
})
export class HabitsModule {}
