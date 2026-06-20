import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ContactsService } from "./contacts.service";
import { CreateEventContactDto } from "./dto/create-event-contact.dto";
import { UpdateEventContactDto } from "./dto/update-event-contact.dto";

@Controller("events/:eventId/contacts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.list(eventId, user);
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createEventContactDto: CreateEventContactDto
  ) {
    return this.contactsService.create(eventId, user, createEventContactDto);
  }

  @Patch(":eventContactId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("eventId") eventId: string,
    @Param("eventContactId") eventContactId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateEventContactDto: UpdateEventContactDto
  ) {
    return this.contactsService.update(eventId, eventContactId, user, updateEventContactDto);
  }
}
