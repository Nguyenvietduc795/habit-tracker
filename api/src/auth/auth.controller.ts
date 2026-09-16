import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthUser } from './jwt-auth.guard.js';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, ...tokens } = await this.auth.register(dto);
    this.setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, ...tokens } = await this.auth.login(dto);
    this.setRefreshCookie(res, tokens);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = this.readRefreshCookie(req);
    const tokens = await this.auth.refresh(raw);
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: this.cookiePath() });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  // ----------------------------------------------------------------- cookie

  /**
   * Refresh token nam trong cookie httpOnly:
   * JavaScript cua trang KHONG doc duoc -> bi chen script cung khong lay duoc.
   * Access token thi tra trong body de frontend giu trong bo nho.
   */
  private setRefreshCookie(res: Response, tokens: TokenPair): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProd, // production chay HTTPS thi bat
      // Frontend goi qua proxy cung ten mien (Vercel /api -> Render) nen la
      // cookie "cung trang": 'lax' la du va Safari khong chan.
      // Chi dat COOKIE_SAMESITE=none neu frontend goi THANG sang ten mien khac.
      sameSite: this.config.get<'lax' | 'strict' | 'none'>('COOKIE_SAMESITE') ?? 'lax',
      path: this.cookiePath(), // chi gui kem khi goi API auth, khong gui lung tung
      expires: tokens.refreshExpiresAt,
    });
  }

  /**
   * Duong dan trinh duyet NHIN THAY. Local goi thang backend: /auth.
   * Production di qua proxy Vercel: trinh duyet thay /api/auth -> dat COOKIE_PATH=/api/auth.
   */
  private cookiePath(): string {
    return this.config.get<string>('COOKIE_PATH') ?? '/auth';
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[REFRESH_COOKIE];
  }
}
