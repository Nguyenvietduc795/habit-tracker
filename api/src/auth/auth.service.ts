import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  timezone: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/** Doi '15m' / '7d' / '24h' thanh so mili-giay. */
function durationToMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2];
  const table: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * table[unit];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------- dang ky

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & TokenPair> {
    // Bam mat khau TRUOC khi cham vao database.
    // Mat khau tho chi ton tai trong bo nho vai mili-giay, khong bao gio duoc luu.
    const passwordHash = await hash(dto.password, 12);

    let row: UserRow | null;
    try {
      row = await this.db.one<UserRow>(
        `insert into users (email, password_hash, display_name, timezone)
         values ($1, $2, $3, coalesce($4, 'Asia/Ho_Chi_Minh'))
         returning id, email, password_hash, display_name, timezone`,
        [
          dto.email.trim().toLowerCase(),
          passwordHash,
          dto.displayName?.trim() ?? '',
          dto.timezone ?? null,
        ],
      );
    } catch (error) {
      // 23505 = vi pham rang buoc duy nhat -> email da co nguoi dung
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email nay da duoc dang ky');
      }
      throw error;
    }

    if (!row) throw new ConflictException('Khong tao duoc tai khoan');

    const tokens = await this.issueTokens(row);
    return { user: this.toPublicUser(row), ...tokens };
  }

  // ------------------------------------------------------------- dang nhap

  async login(dto: LoginDto): Promise<{ user: PublicUser } & TokenPair> {
    const row = await this.db.one<UserRow>(
      `select id, email, password_hash, display_name, timezone
       from users where lower(email) = lower($1)`,
      [dto.email.trim()],
    );

    // Sai email va sai mat khau tra ve CUNG mot thong bao.
    // Neu tach rieng, ke xau do duoc email nao da dang ky trong he thong.
    const passwordOk = row
      ? await compare(dto.password, row.password_hash)
      : false;

    if (!row || !passwordOk) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    const tokens = await this.issueTokens(row);
    return { user: this.toPublicUser(row), ...tokens };
  }

  // ---------------------------------------------------------------- refresh

  /**
   * Xoay vong refresh token: moi lan refresh, token cu bi thu hoi, cap token moi.
   * Neu ai do dung lai token DA THU HOI -> dau hieu bi danh cap
   * -> thu hoi toan bo phien cua user do.
   */
  async refresh(rawToken: string | undefined): Promise<TokenPair> {
    if (!rawToken) {
      throw new UnauthorizedException('Thieu refresh token');
    }

    const tokenHash = this.hashToken(rawToken);

    const row = await this.db.one<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `select id, user_id, expires_at, revoked_at
       from refresh_tokens where token_hash = $1`,
      [tokenHash],
    );

    if (!row) {
      throw new UnauthorizedException('Refresh token khong hop le');
    }

    if (row.revoked_at !== null) {
      // Token da bi thu hoi ma van co nguoi dung -> nghi bi danh cap
      await this.db.query(
        `update refresh_tokens set revoked_at = now()
         where user_id = $1 and revoked_at is null`,
        [row.user_id],
      );
      throw new UnauthorizedException(
        'Phien dang nhap da bi thu hoi, vui long dang nhap lai',
      );
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token da het han');
    }

    const user = await this.db.one<UserRow>(
      `select id, email, password_hash, display_name, timezone
       from users where id = $1`,
      [row.user_id],
    );

    if (!user) {
      throw new UnauthorizedException('Tai khoan khong con ton tai');
    }

    // Thu hoi token cu roi moi cap cai moi
    await this.db.query(
      `update refresh_tokens set revoked_at = now() where id = $1`,
      [row.id],
    );

    return this.issueTokens(user);
  }

  // ----------------------------------------------------------------- logout

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.db.query(
      `update refresh_tokens set revoked_at = now()
       where token_hash = $1 and revoked_at is null`,
      [this.hashToken(rawToken)],
    );
  }

  // --------------------------------------------------------------------- me

  async me(userId: string): Promise<PublicUser> {
    const row = await this.db.one<UserRow>(
      `select id, email, password_hash, display_name, timezone
       from users where id = $1`,
      [userId],
    );
    if (!row) throw new UnauthorizedException('Tai khoan khong con ton tai');
    return this.toPublicUser(row);
  }

  // ------------------------------------------------------------ noi bo

  private async issueTokens(user: UserRow): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      tz: user.timezone,
    });

    // Refresh token la chuoi ngau nhien 384 bit, KHONG phai JWT.
    // Vi no phai thu hoi duoc -> can luu o DB -> can tra cuu duoc.
    const rawToken = randomBytes(48).toString('base64url');
    const refreshMs = durationToMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d',
      7 * 86_400_000,
    );
    const expiresAt = new Date(Date.now() + refreshMs);

    // Luu ban BAM, khong luu token that.
    // DB bi lo thi ke lay duoc cung khong dung de dang nhap duoc.
    await this.db.query(
      `insert into refresh_tokens (user_id, token_hash, expires_at)
       values ($1, $2, $3)`,
      [user.id, this.hashToken(rawToken), expiresAt],
    );

    return { accessToken, refreshToken: rawToken, refreshExpiresAt: expiresAt };
  }

  private hashToken(raw: string): string {
    // Token da la chuoi ngau nhien 384 bit nen sha256 la du.
    // (bcrypt danh cho mat khau nguoi dat - ngan va doan duoc.)
    return createHash('sha256').update(raw).digest('hex');
  }

  private toPublicUser(row: UserRow): PublicUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      timezone: row.timezone,
    };
  }
}
