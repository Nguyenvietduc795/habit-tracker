import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  timezone: string;
}

/**
 * Chan moi request khong co access token hop le.
 * Doc header: Authorization: Bearer <token>
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thieu access token');
    }

    const token = header.slice('Bearer '.length).trim();

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        tz: string;
      }>(token);

      // Gan user vao request de controller lay ra dung
      (request as Request & { user: AuthUser }).user = {
        id: payload.sub,
        email: payload.email,
        timezone: payload.tz,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Access token khong hop le hoac da het han');
    }
  }
}
