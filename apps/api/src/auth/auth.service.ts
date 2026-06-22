import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { OrganizationRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hashInvitationToken } from "../organizations/invitation-token";
import { PrismaService } from "../prisma/prisma.service";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SignupDto } from "./dto/signup.dto";
import { AuthenticatedUser } from "./types/authenticated-user";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async signup(signupDto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email }
    });

    if (existingUser) {
      throw new ConflictException("A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(signupDto.password, 12);

    const { organization, user } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          avatarUrl: signupDto.avatarUrl,
          email: signupDto.email,
          name: signupDto.name,
          passwordHash,
          phone: signupDto.phone
        }
      });

      const createdOrganization = await tx.organization.create({
        data: {
          name: signupDto.organizationName
        }
      });

      await tx.organizationMember.create({
        data: {
          organizationId: createdOrganization.id,
          userId: createdUser.id,
          role: OrganizationRole.ADMIN,
          joinedAt: new Date()
        }
      });

      return {
        organization: createdOrganization,
        user: createdUser
      };
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      role: OrganizationRole.ADMIN
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toSafeUser(user),
      organization,
      tokens
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        organizationMembers: {
          include: {
            organization: true
          },
          orderBy: {
            createdAt: "asc"
          },
          take: 1
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const membership = user.organizationMembers[0];

    if (!membership) {
      throw new UnauthorizedException("User is not attached to an organization.");
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      role: membership.role
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toSafeUser(user),
      activeOrganizationId: membership.organizationId,
      organization: membership.organization,
      role: membership.role,
      tokens
    };
  }

  async getInvitation(inviteToken: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(inviteToken) },
      include: {
        invitedBy: {
          select: {
            avatarUrl: true,
            email: true,
            id: true,
            name: true
          }
        },
        organization: true
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    return {
      acceptedAt: invitation.acceptedAt,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      invitedBy: invitation.invitedBy,
      organization: invitation.organization,
      revokedAt: invitation.revokedAt,
      role: invitation.role,
      status: this.getInvitationStatus(invitation)
    };
  }

  async acceptInvitation(inviteToken: string, acceptInvitationDto: AcceptInvitationDto) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(inviteToken) },
      include: {
        organization: true
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    const status = this.getInvitationStatus(invitation);

    if (status !== "PENDING") {
      throw new BadRequestException(`Invitation is ${status.toLowerCase()}.`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      include: {
        organizationMembers: {
          where: {
            organizationId: invitation.organizationId
          },
          take: 1
        }
      }
    });

    if (existingUser?.organizationMembers.length) {
      throw new ConflictException("This account is already part of the workspace.");
    }

    if (existingUser) {
      throw new ConflictException("This email already has an account. Sign in before accepting workspace invites.");
    }

    const passwordHash = await bcrypt.hash(acceptInvitationDto.password, 12);
    const now = new Date();
    const { organization, user } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          avatarUrl: acceptInvitationDto.avatarUrl,
          email: invitation.email,
          name: acceptInvitationDto.name,
          passwordHash,
          phone: acceptInvitationDto.phone
        }
      });

      await tx.organizationMember.create({
        data: {
          invitedAt: invitation.createdAt,
          joinedAt: now,
          organizationId: invitation.organizationId,
          role: invitation.role,
          userId: createdUser.id
        }
      });

      const acceptedInvitation = await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: now,
          acceptedById: createdUser.id
        },
        include: {
          organization: true
        }
      });

      return {
        organization: acceptedInvitation.organization,
        user: createdUser
      };
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      role: invitation.role
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      activeOrganizationId: organization.id,
      organization,
      role: invitation.role,
      tokens,
      user: this.toSafeUser(user)
    };
  }

  async acceptInvitationForCurrentUser(inviteToken: string, currentUser: AuthenticatedUser) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(inviteToken) },
      include: {
        organization: true
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    const status = this.getInvitationStatus(invitation);

    if (status !== "PENDING") {
      throw new BadRequestException(`Invitation is ${status.toLowerCase()}.`);
    }

    if (invitation.email !== currentUser.email.toLowerCase()) {
      throw new UnauthorizedException("This invitation belongs to another email address.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      include: {
        organizationMembers: {
          where: {
            organizationId: invitation.organizationId
          },
          take: 1
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("User session is not valid.");
    }

    if (user.organizationMembers.length) {
      throw new ConflictException("This account is already part of the workspace.");
    }

    const now = new Date();
    const organization = await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.create({
        data: {
          invitedAt: invitation.createdAt,
          joinedAt: now,
          organizationId: invitation.organizationId,
          role: invitation.role,
          userId: user.id
        }
      });

      const acceptedInvitation = await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: now,
          acceptedById: user.id
        },
        include: {
          organization: true
        }
      });

      return acceptedInvitation.organization;
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      role: invitation.role
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      activeOrganizationId: organization.id,
      organization,
      role: invitation.role,
      tokens,
      user: this.toSafeUser(user)
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organizationMembers: {
          where: {
            organizationId: payload.organizationId
          },
          take: 1
        }
      }
    });

    if (!user?.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException("Refresh token is not active.");
    }

    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token has expired.");
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshTokenDto.refreshToken, user.refreshTokenHash);

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const membership = user.organizationMembers[0];

    if (!membership) {
      throw new UnauthorizedException("User is not attached to this organization.");
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      role: membership.role
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      tokens
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null
      }
    });

    return { success: true };
  }

  private async issueTokens(payload: AuthenticatedUser): Promise<TokenPair> {
    const accessTokenExpiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m") as JwtSignOptions["expiresIn"];
    const refreshTokenExpiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d") as JwtSignOptions["expiresIn"];
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET", "local-access-secret"),
      expiresIn: accessTokenExpiresIn
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET", "local-refresh-secret"),
      expiresIn: refreshTokenExpiresIn
    });

    return {
      accessToken,
      refreshToken
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt
      }
    });
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET", "local-refresh-secret")
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }
  }

  private getInvitationStatus(invitation: {
    acceptedAt: Date | null;
    expiresAt: Date;
    revokedAt: Date | null;
  }) {
    if (invitation.acceptedAt) {
      return "ACCEPTED";
    }

    if (invitation.revokedAt) {
      return "REVOKED";
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      return "EXPIRED";
    }

    return "PENDING";
  }

  private toSafeUser(user: {
    avatarUrl?: string | null;
    designation?: string | null;
    email: string;
    id: string;
    name: string;
    phone: string | null;
  }) {
    return {
      avatarUrl: user.avatarUrl ?? null,
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      designation: user.designation ?? null
    };
  }
}
