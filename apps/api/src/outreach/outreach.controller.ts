import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateOutreachTemplateDto } from "./dto/create-outreach-template.dto";
import { UpdateOutreachTemplateDto } from "./dto/update-outreach-template.dto";
import { OutreachService } from "./outreach.service";

@Controller("events/:eventId/outreach-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.outreachService.list(eventId, user);
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createOutreachTemplateDto: CreateOutreachTemplateDto
  ) {
    return this.outreachService.create(eventId, user, createOutreachTemplateDto);
  }

  @Patch(":templateId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("eventId") eventId: string,
    @Param("templateId") templateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateOutreachTemplateDto: UpdateOutreachTemplateDto
  ) {
    return this.outreachService.update(eventId, templateId, user, updateOutreachTemplateDto);
  }
}
