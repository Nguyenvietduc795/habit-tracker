import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email khong dung dinh dang' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Mat khau phai tu 8 ky tu tro len' })
  @MaxLength(72, { message: 'Mat khau toi da 72 ky tu' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email khong dung dinh dang' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Thieu mat khau' })
  password!: string;
}
