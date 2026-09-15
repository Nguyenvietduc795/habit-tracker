import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HabitsModule } from './habits/habits.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env nam o goc repo (dung chung cho ca web/ va api/), khong nam trong api/
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    HabitsModule,
  ],
})
export class AppModule {}
