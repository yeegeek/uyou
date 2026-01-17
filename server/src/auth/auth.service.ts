import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async wechatLogin(code: string) {
    // TODO: Call WeChat API to get openid and unionid
    // For now, this is a placeholder
    const openid = `wx_${code}`;
    const unionid = `union_${code}`;

    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ wxOpenid: openid }, { wxUnionid: unionid }],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          wxOpenid: openid,
          wxUnionid: unionid,
          phone: '', // Will be updated when user binds phone
          nickname: `用户${Date.now()}`,
          status: 1,
        },
      });
    }

    // Update login time
    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        isConsultant: user.isConsultant,
      },
      ...tokens,
    };
  }

  async bindPhone(userId: string, phone: string) {
    // TODO: Encrypt phone number before storing
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone },
    });

    return { message: 'Phone bound successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const tokens = await this.generateTokens(payload.sub);
      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
