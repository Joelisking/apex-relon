import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private database: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Allow token via query param for SSE (EventSource can't send headers)
        (req) => (req?.query?.token as string) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.database.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'Active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Update last login
    await this.database.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return user;
  }
}
