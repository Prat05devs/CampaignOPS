import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventVendorDto } from "./dto/create-event-vendor.dto";
import { UpdateEventVendorDto } from "./dto/update-event-vendor.dto";

@Injectable()
export class VendorsService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.eventVendor.findMany({
      where: { eventId },
      include: this.eventVendorInclude,
      orderBy: [{ vendor: { category: "asc" } }, { createdAt: "desc" }]
    });
  }

  async create(eventId: string, user: AuthenticatedUser, createEventVendorDto: CreateEventVendorDto) {
    await this.assertEventAccess(eventId, user.organizationId);

    const { performanceNotes, rateCard, ...vendorData } = createEventVendorDto;

    const eventVendor = await this.prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.create({
        data: {
          ...vendorData,
          organizationId: user.organizationId,
          rateCardJson: rateCard?.length ? rateCard : undefined
        }
      });

      return tx.eventVendor.create({
        data: {
          eventId,
          performanceNotes,
          vendorId: vendor.id
        },
        include: this.eventVendorInclude
      });
    });

    await this.activityService.record({
      action: "VENDOR_ASSIGNED",
      entityId: eventVendor.id,
      entityType: "EventVendor",
      eventId,
      metadata: {
        category: eventVendor.vendor.category,
        name: eventVendor.vendor.name,
        paymentStatus: eventVendor.vendor.paymentStatus
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return eventVendor;
  }

  async update(
    eventId: string,
    eventVendorId: string,
    user: AuthenticatedUser,
    updateEventVendorDto: UpdateEventVendorDto
  ) {
    await this.assertEventAccess(eventId, user.organizationId);

    const eventVendor = await this.prisma.eventVendor.findFirst({
      where: {
        id: eventVendorId,
        eventId,
        vendor: {
          organizationId: user.organizationId
        }
      },
      select: {
        id: true,
        vendorId: true
      }
    });

    if (!eventVendor) {
      throw new NotFoundException("Event vendor not found.");
    }

    const { performanceNotes, rateCard, ...vendorData } = updateEventVendorDto;

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.VendorUpdateInput = {
        ...vendorData,
        rateCardJson: rateCard === undefined ? undefined : rateCard
      };

      if (Object.keys(data).length) {
        await tx.vendor.update({
          where: { id: eventVendor.vendorId },
          data
        });
      }

      if (performanceNotes !== undefined) {
        await tx.eventVendor.update({
          where: { id: eventVendor.id },
          data: { performanceNotes }
        });
      }
    });

    const updatedEventVendor = await this.prisma.eventVendor.findUniqueOrThrow({
      where: { id: eventVendor.id },
      include: this.eventVendorInclude
    });

    await this.activityService.record({
      action: updateEventVendorDto.paymentStatus ? "VENDOR_PAYMENT_STATUS_CHANGED" : "VENDOR_UPDATED",
      entityId: updatedEventVendor.id,
      entityType: "EventVendor",
      eventId,
      metadata: {
        category: updatedEventVendor.vendor.category,
        name: updatedEventVendor.vendor.name,
        paymentStatus: updatedEventVendor.vendor.paymentStatus
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return updatedEventVendor;
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

  private readonly eventVendorInclude = {
    vendor: true
  } satisfies Prisma.EventVendorInclude;
}
