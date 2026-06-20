import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventsService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async create(createEventDto: CreateEventDto, user: AuthenticatedUser) {
    const { estimatedBudgetAmount, stakeholders, ...data } = createEventDto;

    const event = await this.prisma.event.create({
      data: {
        ...data,
        organizationId: user.organizationId,
        createdById: user.sub,
        estimatedBudgetAmount:
          estimatedBudgetAmount === undefined ? undefined : new Prisma.Decimal(estimatedBudgetAmount),
        stakeholdersJson: stakeholders?.length ? stakeholders : undefined
      }
    });

    await this.activityService.record({
      action: "EVENT_CREATED",
      entityId: event.id,
      entityType: "Event",
      eventId: event.id,
      metadata: {
        status: event.status,
        title: event.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return event;
  }

  list({ organizationId }: { organizationId: string }) {
    return this.prisma.event.findMany({
      where: { organizationId },
      orderBy: {
        updatedAt: "desc"
      }
    });
  }

  async findById(id: string, organizationId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId },
      include: {
        tasks: true,
        budgetItems: true,
        eventContacts: {
          include: {
            contact: true
          }
        },
        eventVendors: {
          include: {
            vendor: true
          }
        }
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    return event;
  }

  async update(id: string, user: AuthenticatedUser, updateEventDto: UpdateEventDto) {
    const existingEvent = await this.prisma.event.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, status: true }
    });

    if (!existingEvent) {
      throw new NotFoundException("Event not found.");
    }

    const { actualBudgetAmount, estimatedBudgetAmount, stakeholders, ...data } = updateEventDto;

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...data,
        actualBudgetAmount:
          actualBudgetAmount === undefined ? undefined : new Prisma.Decimal(actualBudgetAmount),
        estimatedBudgetAmount:
          estimatedBudgetAmount === undefined ? undefined : new Prisma.Decimal(estimatedBudgetAmount),
        stakeholdersJson: stakeholders === undefined ? undefined : stakeholders
      }
    });

    await this.activityService.record({
      action: updateEventDto.status && updateEventDto.status !== existingEvent.status ? "EVENT_STATUS_CHANGED" : "EVENT_UPDATED",
      entityId: event.id,
      entityType: "Event",
      eventId: event.id,
      metadata: {
        previousStatus: existingEvent.status,
        status: event.status,
        title: event.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return event;
  }
}
