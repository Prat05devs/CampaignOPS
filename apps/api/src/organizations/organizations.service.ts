import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationInvitationDto } from "./dto/create-organization-invitation.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { createInvitationToken, hashInvitationToken } from "./invitation-token";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createOrganizationDto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: createOrganizationDto
    });
  }

  async findById(id: string, currentUser: AuthenticatedUser) {
    this.assertCurrentOrganization(id, currentUser);

    const organization = await this.prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return organization;
  }

  listMembers(id: string, currentUser: AuthenticatedUser) {
    this.assertCurrentOrganization(id, currentUser);

    return this.prisma.organizationMember.findMany({
      where: { organizationId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            designation: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });
  }

  listInvitations(id: string, currentUser: AuthenticatedUser) {
    this.assertCurrentOrganization(id, currentUser);

    return this.prisma.organizationInvitation.findMany({
      where: { organizationId: id },
      include: {
        acceptedBy: {
          select: {
            avatarUrl: true,
            email: true,
            id: true,
            name: true
          }
        },
        invitedBy: {
          select: {
            avatarUrl: true,
            email: true,
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async createInvitation(
    id: string,
    createInvitationDto: CreateOrganizationInvitationDto,
    currentUser: AuthenticatedUser
  ) {
    this.assertCurrentOrganization(id, currentUser);

    const email = createInvitationDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organizationMembers: {
          where: { organizationId: id },
          take: 1
        }
      }
    });

    if (existingUser?.organizationMembers.length) {
      throw new ConflictException("This user is already part of the workspace.");
    }

    const now = new Date();
    await this.prisma.organizationInvitation.updateMany({
      where: {
        acceptedAt: null,
        email,
        expiresAt: { gt: now },
        organizationId: id,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });

    const inviteToken = createInvitationToken();
    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedById: currentUser.sub,
        organizationId: id,
        role: createInvitationDto.role,
        tokenHash: hashInvitationToken(inviteToken)
      },
      include: {
        invitedBy: {
          select: {
            avatarUrl: true,
            email: true,
            id: true,
            name: true
          }
        }
      }
    });

    return {
      ...invitation,
      inviteToken
    };
  }

  async revokeInvitation(id: string, invitationId: string, currentUser: AuthenticatedUser) {
    this.assertCurrentOrganization(id, currentUser);

    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId: id
      },
      select: {
        acceptedAt: true,
        id: true,
        revokedAt: true
      }
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.acceptedAt || invitation.revokedAt) {
      return invitation;
    }

    return this.prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: {
        revokedAt: new Date()
      }
    });
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto, currentUser: AuthenticatedUser) {
    this.assertCurrentOrganization(id, currentUser);

    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return this.prisma.organization.update({
      where: { id },
      data: updateOrganizationDto
    });
  }

  private assertCurrentOrganization(id: string, currentUser: AuthenticatedUser) {
    if (id !== currentUser.organizationId) {
      throw new NotFoundException("Organization not found.");
    }
  }
}
