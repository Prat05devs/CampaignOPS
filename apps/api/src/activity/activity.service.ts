import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

type ActivityRecordInput = {
  action: string;
  entityId?: string;
  entityType: string;
  eventId?: string;
  metadata?: Prisma.InputJsonValue;
  organizationId: string;
  userId?: string | null;
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.activityLog.findMany({
      where: {
        eventId,
        organizationId: user.organizationId
      },
      include: this.activityLogInclude,
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });
  }

  async record(input: ActivityRecordInput) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          action: input.action,
          entityId: input.entityId,
          entityType: input.entityType,
          eventId: input.eventId,
          metadataJson: input.metadata,
          organizationId: input.organizationId,
          userId: input.userId
        }
      });
    } catch {
      return null;
    }
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

  private readonly activityLogInclude = {
    user: {
      select: {
        avatarUrl: true,
        email: true,
        id: true,
        name: true
      }
    }
  } satisfies Prisma.ActivityLogInclude;
}
