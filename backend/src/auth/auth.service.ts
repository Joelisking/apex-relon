import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private database: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private permissionsService: PermissionsService,
  ) {}

  async validateUser(email: string, password: string): Promise<Record<string, unknown> | null> {
    const user = await this.database.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    if (!user.password) {
      throw new BadRequestException(
        'Please set your password first. Contact your administrator.'
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException('Your account is inactive');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: Record<string, unknown>) {
    try {
      await this.database.user.update({
        where: { id: user.id as string },
        data: { lastLogin: new Date() },
      });
      this.logger.log(`login: last login updated userId=${user.id as string}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'login.updateLastLogin');
    }

    const permissions = await this.permissionsService.getPermissionsForRole(user.role as string);

    const payload = {
      email: user.email as string,
      sub: user.id as string,
      role: user.role as string,
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: (user.phone as string) ?? null,
        mustCompleteProfile: (user.mustCompleteProfile as boolean) ?? false,
      },
      permissions,
    };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return [];
    return this.permissionsService.getPermissionsForRole(user.role);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.database.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let user: Awaited<ReturnType<typeof this.database.user.create>>;
    try {
      user = await this.database.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
          role: registerDto.role || 'SALES',
          status: 'Active',
        },
      });
      this.logger.log(`register: user created id=${user.id} email=${user.email}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'register');
    }

    await this.emailService.sendWelcomeEmail(user!.email, user!.name);

    const { password: _, ...userWithoutPassword } = user!;

    const payload = { email: user!.email, sub: user!.id, role: user!.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.database.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If an account exists, a password reset email has been sent' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    try {
      await this.database.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: expiresAt,
        },
      });
      this.logger.log(`forgotPassword: reset token stored userId=${user.id}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'forgotPassword.storeToken');
    }

    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.name,
    );

    return { message: 'If an account exists, a password reset email has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const users = await this.database.user.findMany({
      where: {
        resetPasswordToken: { not: null },
        resetPasswordExpires: { gt: new Date() },
      },
    });

    let matchedUser = null;
    for (const user of users) {
      if (user.resetPasswordToken) {
        const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken);
        if (isTokenValid) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      await this.database.user.update({
        where: { id: matchedUser.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
      this.logger.log(`resetPassword: password reset userId=${matchedUser.id}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'resetPassword.updatePassword');
    }

    await this.emailService.sendPasswordChangedEmail(
      matchedUser.email,
      matchedUser.name,
    );

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.database.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    try {
      await this.database.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      this.logger.log(`changePassword: password changed userId=${userId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'changePassword.updatePassword');
    }

    await this.emailService.sendPasswordChangedEmail(user.email, user.name);

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.database.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        mustCompleteProfile: true,
        status: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateData: { name?: string; phone?: string }) {
    try {
      const user = await this.database.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          mustCompleteProfile: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          mustCompleteProfile: true,
          status: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true,
        },
      });
      this.logger.log(`updateProfile: profile updated userId=${userId}`);
      return user;
    } catch (error) {
      handlePrismaError(error, this.logger, 'updateProfile');
    }
  }
}
