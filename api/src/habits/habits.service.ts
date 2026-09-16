import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { currentStreak, longestStreak, todayIn } from '../common/date.util.js';
import { DatabaseService } from '../database/database.service.js';
import { AuthUser } from '../auth/jwt-auth.guard.js';
import {
  CreateCheckInDto,
  CreateHabitDto,
  UpdateHabitDto,
} from './dto/habit.dto.js';

interface HabitRow {
  id: string;
  name: string;
  frequency: string;
  color: string | null;
  archived_at: Date | null;
  created_at: Date;
}

@Injectable()
export class HabitsService {
  constructor(private readonly db: DatabaseService) {}

  // ------------------------------------------------------------ danh sach

  async findAll(user: AuthUser, includeArchived: boolean) {
    const habits = await this.db.query<HabitRow>(
      `select id, name, frequency, color, archived_at, created_at
       from habits
       where user_id = $1
         and ($2::boolean or archived_at is null)
       order by created_at asc`,
      [user.id, includeArchived],
    );

    // Lay het check-in cua user trong 1 cau, roi gom theo habit o tang ung dung.
    // Tranh N+1: 10 habit khong co nghia la 10 lan goi database.
    const rows = await this.db.query<{ habit_id: string; done_on: string }>(
      `select c.habit_id, c.done_on::text as done_on
       from check_ins c
       join habits h on h.id = c.habit_id
       where h.user_id = $1
       order by c.done_on desc`,
      [user.id],
    );

    const byHabit = new Map<string, string[]>();
    for (const row of rows) {
      const list = byHabit.get(row.habit_id);
      if (list) list.push(row.done_on);
      else byHabit.set(row.habit_id, [row.done_on]);
    }

    const today = todayIn(user.timezone);

    return habits.map((habit) => {
      const dates = byHabit.get(habit.id) ?? [];
      return {
        ...this.toPublic(habit),
        currentStreak: currentStreak(dates, today),
        checkedToday: dates.includes(today),
      };
    });
  }

  // -------------------------------------------------------------- chi tiet

  async findOne(user: AuthUser, habitId: string) {
    const habit = await this.getOwnedHabit(user, habitId);

    const rows = await this.db.query<{ done_on: string; note: string | null }>(
      `select done_on::text as done_on, note
       from check_ins where habit_id = $1
       order by done_on desc`,
      [habitId],
    );

    const dates = rows.map((r) => r.done_on);
    const today = todayIn(user.timezone);

    return {
      ...this.toPublic(habit),
      currentStreak: currentStreak(dates, today),
      longestStreak: longestStreak(dates),
      checkedToday: dates.includes(today),
      checkIns: rows.map((r) => ({ doneOn: r.done_on, note: r.note })),
    };
  }

  // ------------------------------------------------------------------ tao

  async create(user: AuthUser, dto: CreateHabitDto) {
    const row = await this.db.one<HabitRow>(
      `insert into habits (user_id, name, frequency, color)
       values ($1, $2, coalesce($3, 'daily'), $4)
       returning id, name, frequency, color, archived_at, created_at`,
      [user.id, dto.name.trim(), dto.frequency ?? null, dto.color ?? null],
    );
    if (!row) throw new BadRequestException('Khong tao duoc thoi quen');
    return { ...this.toPublic(row), currentStreak: 0, checkedToday: false };
  }

  // ------------------------------------------------------------------ sua

  async update(user: AuthUser, habitId: string, dto: UpdateHabitDto) {
    await this.getOwnedHabit(user, habitId);

    const row = await this.db.one<HabitRow>(
      `update habits set
         name      = coalesce($3, name),
         frequency = coalesce($4, frequency),
         color     = coalesce($5, color)
       where id = $1 and user_id = $2
       returning id, name, frequency, color, archived_at, created_at`,
      [
        habitId,
        user.id,
        dto.name?.trim() ?? null,
        dto.frequency ?? null,
        dto.color ?? null,
      ],
    );
    if (!row) throw new NotFoundException('Khong tim thay thoi quen');
    return this.toPublic(row);
  }

  // -------------------------------------------------------------- luu tru

  async setArchived(user: AuthUser, habitId: string, archived: boolean) {
    await this.getOwnedHabit(user, habitId);

    const row = await this.db.one<HabitRow>(
      `update habits set archived_at = case when $3 then now() else null end
       where id = $1 and user_id = $2
       returning id, name, frequency, color, archived_at, created_at`,
      [habitId, user.id, archived],
    );
    if (!row) throw new NotFoundException('Khong tim thay thoi quen');
    return this.toPublic(row);
  }

  // ------------------------------------------------------------------ xoa

  async remove(user: AuthUser, habitId: string): Promise<void> {
    const row = await this.db.one<{ id: string }>(
      `delete from habits where id = $1 and user_id = $2 returning id`,
      [habitId, user.id],
    );
    if (!row) throw new NotFoundException('Khong tim thay thoi quen');
  }

  // ------------------------------------------------------------- check-in

  async checkIn(user: AuthUser, habitId: string, dto: CreateCheckInDto) {
    const habit = await this.getOwnedHabit(user, habitId);

    if (habit.archived_at !== null) {
      throw new BadRequestException('Thoi quen da luu tru, khong tick duoc');
    }

    const today = todayIn(user.timezone);
    const date = dto.date ?? today;

    // LUAT SAN PHAM: chi tick duoc cho HOM NAY.
    // Cho tick bu ngay cu thi ai cung tu "va" duoc chuoi -> con so 🔥 mat y nghia.
    // Database khong giu duoc luat nay (CHECK khong dung duoc current_date)
    // nen backend phai kiem — giau nut o frontend thoi la chua du.
    if (date !== today) {
      throw new BadRequestException(
        date > today
          ? 'Khong tick duoc cho ngay tuong lai'
          : 'Chi tick duoc cho hom nay, khong tick bu ngay cu',
      );
    }

    try {
      await this.db.query(
        `insert into check_ins (habit_id, done_on, note) values ($1, $2, $3)`,
        [habitId, date, dto.note ?? null],
      );
    } catch (error) {
      // 23505 = da tick ngay do roi. Luat nay DATABASE giu, backend chi dich loi.
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(`Da danh dau cho ngay ${date} roi`);
      }
      throw error;
    }

    const dates = await this.datesOf(habitId);
    return {
      doneOn: date,
      note: dto.note ?? null,
      currentStreak: currentStreak(dates, today),
    };
  }

  async removeCheckIn(
    user: AuthUser,
    habitId: string,
    date: string | undefined,
  ): Promise<void> {
    await this.getOwnedHabit(user, habitId);

    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Tham so date phai dang YYYY-MM-DD');
    }

    // Lich su ngay cu da khoa: khong tick bu duoc thi cung khong xoa duoc.
    // Chi bo tick duoc cho hom nay (lo tay bam nham).
    const today = todayIn(user.timezone);
    if (date !== undefined && date !== today) {
      throw new BadRequestException('Chi bo tick duoc cho hom nay, lich su ngay cu da khoa');
    }
    date = today;

    const row = await this.db.one<{ id: string }>(
      `delete from check_ins where habit_id = $1 and done_on = $2 returning id`,
      [habitId, date],
    );
    if (!row) throw new NotFoundException(`Khong co danh dau ngay ${date}`);
  }

  async listCheckIns(
    user: AuthUser,
    habitId: string,
    from?: string,
    to?: string,
  ) {
    await this.getOwnedHabit(user, habitId);

    const rows = await this.db.query<{ done_on: string; note: string | null }>(
      `select done_on::text as done_on, note
       from check_ins
       where habit_id = $1
         and ($2::date is null or done_on >= $2::date)
         and ($3::date is null or done_on <= $3::date)
       order by done_on desc`,
      [habitId, from ?? null, to ?? null],
    );

    return rows.map((r) => ({ doneOn: r.done_on, note: r.note }));
  }

  // ------------------------------------------------------------ noi bo

  /**
   * Kiem tra quyen so huu — LUAT SO 1 cua ca he thong.
   * Habit cua nguoi khac tra ve 404 chu khong phai 403:
   * tra 403 la vo tinh xac nhan "id nay co that".
   */
  private async getOwnedHabit(
    user: AuthUser,
    habitId: string,
  ): Promise<HabitRow> {
    if (!/^[0-9a-f-]{36}$/i.test(habitId)) {
      throw new NotFoundException('Khong tim thay thoi quen');
    }

    const row = await this.db.one<HabitRow>(
      `select id, name, frequency, color, archived_at, created_at
       from habits where id = $1 and user_id = $2`,
      [habitId, user.id],
    );

    if (!row) throw new NotFoundException('Khong tim thay thoi quen');
    return row;
  }

  private async datesOf(habitId: string): Promise<string[]> {
    const rows = await this.db.query<{ done_on: string }>(
      `select done_on::text as done_on from check_ins
       where habit_id = $1 order by done_on desc`,
      [habitId],
    );
    return rows.map((r) => r.done_on);
  }

  private toPublic(row: HabitRow) {
    return {
      id: row.id,
      name: row.name,
      frequency: row.frequency,
      color: row.color,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
    };
  }
}
