import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

/**
 * Lop mong bao quanh connection pool cua Postgres.
 * Khong dung ORM: SQL viet tay, nhin thay duoc cau lenh that chay xuong DB.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('Thieu DATABASE_URL trong .env');
    }

    const isLocal =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1');

    this.pool = new Pool({
      connectionString,
      // Supabase bat buoc SSL; Postgres local thi khong.
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }

  /** Chay cau lenh, tra ve mang dong. */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(text, params as never[]);
    return result.rows;
  }

  /** Chay cau lenh, tra ve dong dau tien hoac null. */
  async one<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
