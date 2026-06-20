import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateEventVendorDto } from "./dto/create-event-vendor.dto";
import { UpdateEventVendorDto } from "./dto/update-event-vendor.dto";
import { VendorsService } from "./vendors.service";

@Controller("events/:eventId/vendors")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vendorsService.list(eventId, user);
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createEventVendorDto: CreateEventVendorDto
  ) {
    return this.vendorsService.create(eventId, user, createEventVendorDto);
  }

  @Patch(":eventVendorId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("eventId") eventId: string,
    @Param("eventVendorId") eventVendorId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateEventVendorDto: UpdateEventVendorDto
  ) {
    return this.vendorsService.update(eventId, eventVendorId, user, updateEventVendorDto);
  }
}
