import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER)
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(id, user);
  }

  @Patch(":id/profile")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER)
  updateProfile(
    @Param("id") id: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.usersService.updateProfile(id, updateUserProfileDto, user);
  }
}
