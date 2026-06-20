import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventsService } from "./events.service";

@Controller("events")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.create(createEventDto, user);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.list({ organizationId: user.organizationId });
  }

  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.findById(id, user.organizationId);
  }

  @Patch(":id")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.update(id, user, updateEventDto);
  }
}
