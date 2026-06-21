import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async findById(id: string, currentUser: AuthenticatedUser) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        userId: id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            designation: true,
            avatarUrl: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!membership) {
      throw new NotFoundException("User not found.");
    }

    return membership.user;
  }

  async updateProfile(id: string, updateUserProfileDto: UpdateUserProfileDto, currentUser: AuthenticatedUser) {
    if (id !== currentUser.sub) {
      throw new ForbiddenException("You can update only your own profile.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.sub },
      data: updateUserProfileDto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        designation: true,
        avatarUrl: true,
        updatedAt: true
      }
    });

    await this.activityService.record({
      action: "PROFILE_UPDATED",
      entityId: updatedUser.id,
      entityType: "User",
      metadata: {
        avatarUpdated: updateUserProfileDto.avatarUrl !== undefined,
        name: updatedUser.name
      },
      organizationId: currentUser.organizationId,
      userId: currentUser.sub
    });

    return updatedUser;
  }
}
