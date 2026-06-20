import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

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
