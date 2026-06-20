import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  updateProfile(id: string, updateUserProfileDto: UpdateUserProfileDto, currentUser: AuthenticatedUser) {
    if (id !== currentUser.sub) {
      throw new ForbiddenException("You can update only your own profile.");
    }

    return this.prisma.user.update({
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
  }
}
