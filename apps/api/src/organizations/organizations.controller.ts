import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateOrganizationInvitationDto } from "./dto/create-organization-invitation.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(OrganizationRole.ADMIN)
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get(":id")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER, OrganizationRole.MEMBER)
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findById(id, user);
  }

  @Get(":id/members")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  listMembers(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listMembers(id, user);
  }

  @Get(":id/invitations")
  @Roles(OrganizationRole.ADMIN)
  listInvitations(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listInvitations(id, user);
  }

  @Post(":id/invitations")
  @Roles(OrganizationRole.ADMIN)
  createInvitation(
    @Param("id") id: string,
    @Body() createInvitationDto: CreateOrganizationInvitationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.organizationsService.createInvitation(id, createInvitationDto, user);
  }

  @Patch(":id/invitations/:invitationId/revoke")
  @Roles(OrganizationRole.ADMIN)
  revokeInvitation(
    @Param("id") id: string,
    @Param("invitationId") invitationId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.organizationsService.revokeInvitation(id, invitationId, user);
  }

  @Patch(":id")
  @Roles(OrganizationRole.ADMIN)
  update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.organizationsService.update(id, updateOrganizationDto, user);
  }
}
