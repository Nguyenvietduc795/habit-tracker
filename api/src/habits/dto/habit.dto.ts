import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHabitDto {
  @IsString()
  @MinLength(1, { message: 'Ten thoi quen khong duoc de trong' })
  @MaxLength(100, { message: 'Ten thoi quen toi da 100 ky tu' })
  name!: string;

  @IsOptional()
  @IsIn(['daily', 'weekly'], { message: 'frequency chi nhan daily hoac weekly' })
  frequency?: 'daily' | 'weekly';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly'])
  frequency?: 'daily' | 'weekly';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class ArchiveHabitDto {
  @IsBoolean({ message: 'archived phai la true hoac false' })
  archived!: boolean;
}

export class CreateCheckInDto {
  /**
   * Khong gui thi mac dinh la hom nay theo mui gio cua user.
   * Gui ngay khac hom nay -> 400 (chi tick duoc cho hom nay).
   */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'date phai dang YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
