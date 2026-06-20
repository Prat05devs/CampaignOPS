import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventContactDto } from "./dto/create-event-contact.dto";
import { UpdateEventContactDto } from "./dto/update-event-contact.dto";

@Injectable()
export class ContactsService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.eventContact.findMany({
      where: { eventId },
      include: this.eventContactInclude,
      orderBy: [{ contact: { status: "asc" } }, { createdAt: "desc" }]
    });
  }

  async create(eventId: string, user: AuthenticatedUser, createEventContactDto: CreateEventContactDto) {
    await this.assertEventAccess(eventId, user.organizationId);

    const { eventNotes, ...contactData } = createEventContactDto;

    const eventContact = await this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          ...contactData,
          organizationId: user.organizationId
        }
      });

      return tx.eventContact.create({
        data: {
          contactId: contact.id,
          eventId,
          notes: eventNotes
        },
        include: this.eventContactInclude
      });
    });

    await this.activityService.record({
      action: "CONTACT_ADDED",
      entityId: eventContact.id,
      entityType: "EventContact",
      eventId,
      metadata: {
        category: eventContact.contact.category,
        name: eventContact.contact.name,
        status: eventContact.contact.status
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return eventContact;
  }

  async update(
    eventId: string,
    eventContactId: string,
    user: AuthenticatedUser,
    updateEventContactDto: UpdateEventContactDto
  ) {
    await this.assertEventAccess(eventId, user.organizationId);

    const eventContact = await this.prisma.eventContact.findFirst({
      where: {
        id: eventContactId,
        eventId,
        contact: {
          organizationId: user.organizationId
        }
      },
      select: {
        contactId: true,
        id: true
      }
    });

    if (!eventContact) {
      throw new NotFoundException("Event contact not found.");
    }

    const { eventNotes, ...contactData } = updateEventContactDto;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(contactData).length) {
        await tx.contact.update({
          where: { id: eventContact.contactId },
          data: contactData
        });
      }

      if (eventNotes !== undefined) {
        await tx.eventContact.update({
          where: { id: eventContact.id },
          data: { notes: eventNotes }
        });
      }
    });

    const updatedEventContact = await this.prisma.eventContact.findUniqueOrThrow({
      where: { id: eventContact.id },
      include: this.eventContactInclude
    });

    await this.activityService.record({
      action: updateEventContactDto.status ? "CONTACT_STATUS_CHANGED" : "CONTACT_UPDATED",
      entityId: updatedEventContact.id,
      entityType: "EventContact",
      eventId,
      metadata: {
        category: updatedEventContact.contact.category,
        name: updatedEventContact.contact.name,
        status: updatedEventContact.contact.status
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return updatedEventContact;
  }

  private async assertEventAccess(eventId: string, organizationId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId
      },
      select: { id: true }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }
  }

  private readonly eventContactInclude = {
    contact: true
  } satisfies Prisma.EventContactInclude;
}
