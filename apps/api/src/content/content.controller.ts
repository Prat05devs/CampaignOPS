import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ContentService } from "./content.service";
import { CreateContentItemDto } from "./dto/create-content-item.dto";
import { UpdateContentItemDto } from "./dto/update-content-item.dto";

@Controller("events/:eventId/content-items")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contentService.list(eventId, user);
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createContentItemDto: CreateContentItemDto
  ) {
    return this.contentService.create(eventId, user, createContentItemDto);
  }

  @Patch(":contentItemId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("eventId") eventId: string,
    @Param("contentItemId") contentItemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateContentItemDto: UpdateContentItemDto
  ) {
    return this.contentService.update(eventId, contentItemId, user, updateContentItemDto);
  }
}
