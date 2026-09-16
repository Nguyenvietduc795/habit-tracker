import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

/**
 * Render goi /health dinh ky de biet server con song.
 * Kiem luon database: server chay ma khong noi duoc DB thi cung coi nhu hong.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check() {
    try {
      await this.db.query('select 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Khong ket noi duoc database');
    }
  }
}
