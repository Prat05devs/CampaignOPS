import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { SaveEventDebriefDto } from "./dto/save-event-debrief.dto";
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

  async saveDebrief(id: string, user: AuthenticatedUser, saveEventDebriefDto: SaveEventDebriefDto) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        budgetItems: true,
        eventVendors: {
          include: {
            vendor: true
          }
        },
        tasks: true
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const existingEntry = await this.prisma.playbookEntry.findFirst({
      where: {
        eventId: id,
        organizationId: user.organizationId
      },
      select: { id: true }
    });

    const learningsJson = {
      completion: {
        blockedTasks: event.tasks.filter((task) => task.status === "BLOCKED").length,
        doneTasks: event.tasks.filter((task) => task.status === "DONE").length,
        totalTasks: event.tasks.length
      },
      reusableChecklist: normalizeList(saveEventDebriefDto.reusableChecklist),
      summary: normalizeText(saveEventDebriefDto.summary),
      whatToImprove: normalizeList(saveEventDebriefDto.whatToImprove),
      whatWorked: normalizeList(saveEventDebriefDto.whatWorked)
    } satisfies Prisma.InputJsonObject;

    const vendorNotesJson = {
      notes: normalizeList(saveEventDebriefDto.vendorNotes),
      vendors: event.eventVendors.map((eventVendor) => ({
        category: eventVendor.vendor.category,
        name: eventVendor.vendor.name,
        paymentStatus: eventVendor.vendor.paymentStatus,
        performanceNotes: eventVendor.performanceNotes
      }))
    } satisfies Prisma.InputJsonObject;

    const riskNotesJson = {
      notes: normalizeList(saveEventDebriefDto.riskNotes),
      overduePayments: event.budgetItems.filter((item) => item.paymentStatus === "OVERDUE").length,
      overBudgetLines: event.budgetItems.filter((item) => Number(item.actualAmount) > Number(item.estimatedAmount)).length
    } satisfies Prisma.InputJsonObject;

    const playbookEntry = existingEntry
      ? await this.prisma.playbookEntry.update({
          where: { id: existingEntry.id },
          data: {
            budgetRange: getBudgetRange(event.estimatedBudgetAmount ? Number(event.estimatedBudgetAmount) : null),
            city: event.city,
            learningsJson,
            riskNotesJson,
            vendorNotesJson
          }
        })
      : await this.prisma.playbookEntry.create({
          data: {
            budgetRange: getBudgetRange(event.estimatedBudgetAmount ? Number(event.estimatedBudgetAmount) : null),
            city: event.city,
            eventId: id,
            eventType: event.category,
            learningsJson,
            organizationId: user.organizationId,
            riskNotesJson,
            scale: event.scaleTier,
            vendorNotesJson
          }
        });

    await this.activityService.record({
      action: existingEntry ? "PLAYBOOK_ENTRY_UPDATED" : "PLAYBOOK_ENTRY_CREATED",
      entityId: playbookEntry.id,
      entityType: "PlaybookEntry",
      eventId: id,
      metadata: {
        eventType: playbookEntry.eventType,
        scale: playbookEntry.scale
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return playbookEntry;
  }
}

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeList(value: string[] | undefined) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function getBudgetRange(value: number | null) {
  if (!value) {
    return "Unknown";
  }

  if (value < 50000) {
    return "Under 50K";
  }

  if (value < 200000) {
    return "50K-2L";
  }

  if (value < 1000000) {
    return "2L-10L";
  }

  return "10L+";
}
